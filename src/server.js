import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';
import connectDB from './config/database.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import User from './models/User.js';

// Load env vars
dotenv.config();

// Validate critical environment variables at startup
const requiredEnvVars = [
  'JWT_SECRET',
  'MONGODB_URI',
  'ADMIN_CREATE_PASSCODE'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  console.error('See .env.example for reference.\n');
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all localhost and local network origins
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
      /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
    ];
    
    if (allowedPatterns.some(pattern => pattern.test(origin))) {
      callback(null, true);
    }

    // Allow origins explicitly configured via ALLOWED_ORIGINS env var (comma-separated)
    const allowedFromEnv = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    if (allowedFromEnv.includes(origin)) {
      return callback(null, true);
    }

    // Allow common hosting platform preview domains (e.g., Vercel, Netlify)
    try {
      if (origin.includes('.vercel.app') || origin.includes('.netlify.app')) {
        return callback(null, true);
      }
    } catch (e) {
      // ignore and fall through to rejection
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression middleware for response optimization
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Balanced compression level
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Use combined log format in production for better performance
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hatra Suci API is running...' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create default admin user if not exists
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        isAdmin: true,
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Serverless deployment check:
// - If SERVERLESS=true, export the app for Vercel/Lambda handlers
// - Otherwise, start the HTTP server (for VPS/long-lived hosting)
if (process.env.SERVERLESS === 'true') {
  // Export for serverless (Vercel, AWS Lambda, etc.)
  console.log('Running in serverless mode - app exported without listening');
} else {
  // Traditional server mode (VPS, Docker, etc.)
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    createAdminUser();
  });
}

// Export app for serverless handlers or testing
export default app;
