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

const router = express.Router();

router.post('/register', checkMaintenanceMode, register);
router.post('/login', checkMaintenanceMode, login);
router.post('/admin-login', adminLogin);
router.post('/registration-deposit', checkMaintenanceMode, submitRegistrationDeposit);
router.get('/settings', getPublicSettings);
router.route('/profile')
  .get(protect, checkMaintenanceMode, getProfile)
  .put(protect, checkMaintenanceMode, updateProfile);

export default router;
