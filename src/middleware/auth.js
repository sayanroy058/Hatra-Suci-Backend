import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Settings from '../models/Settings.js';

export const checkMaintenanceMode = async (req, res, next) => {
  try {
    const maintenanceSetting = await Settings.findOne({ key: 'maintenanceMode' });
    const isMaintenanceMode = maintenanceSetting?.value === true;
    
    if (isMaintenanceMode) {
      // Check if user is admin
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const admin = await Admin.findById(decoded.id);
          if (admin) {
            // Admin can proceed even in maintenance mode
            return next();
          }
        } catch (error) {
          // Token invalid or not admin, continue to maintenance check
        }
      }
      
      return res.status(503).json({ 
        message: 'Platform is under maintenance. Please try again later.',
        maintenanceMode: true
      });
    }
    
    next();
  } catch (error) {
    next();
  }
};

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Try to find user first, then admin
      let user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        user = await Admin.findById(decoded.id).select('-password');
        if (user) {
          user.isAdmin = true; // Mark as admin for middleware checks
        }
      }

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as admin' });
  }
};

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};
