import express from 'express';
import {
  createDeposit,
  getDeposits,
  createWithdrawal,
  getWithdrawals,
  getTransactions,
  getReferrals,
  spinWheel,
  checkLevelRewards,
} from '../controllers/userController.js';
import { protect, checkMaintenanceMode } from '../middleware/auth.js';
import { depositLimiter, withdrawalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.route('/deposits')
  .get(protect, checkMaintenanceMode, getDeposits)
  .post(protect, depositLimiter, checkMaintenanceMode, createDeposit);

router.route('/withdrawals')
  .get(protect, checkMaintenanceMode, getWithdrawals)
  .post(protect, withdrawalLimiter, checkMaintenanceMode, createWithdrawal);

router.get('/transactions', protect, checkMaintenanceMode, getTransactions);
router.get('/referrals', protect, checkMaintenanceMode, getReferrals);
router.post('/spin-wheel', protect, checkMaintenanceMode, spinWheel);
router.post('/level-rewards/check', protect, checkMaintenanceMode, checkLevelRewards);

export default router;
