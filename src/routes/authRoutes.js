import express from 'express';
import {
  register,
  login,
  adminLogin,
  getProfile,
  updateProfile,
  submitRegistrationDeposit,
  getPublicSettings,
} from '../controllers/authController.js';
import { protect, checkMaintenanceMode } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, checkMaintenanceMode, register);
router.post('/login', authLimiter, checkMaintenanceMode, login);
router.post('/admin-login', authLimiter, adminLogin);
router.post('/registration-deposit', authLimiter, checkMaintenanceMode, submitRegistrationDeposit);
router.get('/settings', getPublicSettings);
router.route('/profile')
  .get(protect, checkMaintenanceMode, getProfile)
  .put(protect, checkMaintenanceMode, updateProfile);

export default router;
