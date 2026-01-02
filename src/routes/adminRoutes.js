import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllDeposits,
  updateDeposit,
  getAllWithdrawals,
  updateWithdrawal,
  getAllTransactions,
  getRecentTransactions,
  getDashboardStats,
  getSettings,
  updateSettings,
  getPendingRegistrations,
  verifyRegistrationDeposit,
  creditBonus,
  createAdmin,
  getFinanceOverview,
  getUserAverages,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// User management
router.get('/users', protect, admin, getAllUsers);
router.route('/users/:id')
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

// Deposit management
router.get('/deposits', protect, admin, getAllDeposits);
router.put('/deposits/:id', protect, admin, updateDeposit);

// Withdrawal management
router.get('/withdrawals', protect, admin, getAllWithdrawals);
router.put('/withdrawals/:id', protect, admin, updateWithdrawal);

// Transactions
router.get('/transactions/recent', protect, admin, getRecentTransactions);
router.get('/transactions', protect, admin, getAllTransactions);

// Stats
router.get('/stats', protect, admin, getDashboardStats);

// Settings
router.route('/settings')
  .get(protect, admin, getSettings)
  .put(protect, admin, updateSettings);

// Registration Verification
router.get('/registration-deposits', protect, admin, getPendingRegistrations);
router.put('/registration-deposits/:id', protect, admin, verifyRegistrationDeposit);

// Bonus Management
router.post('/bonus', protect, admin, creditBonus);

// Admin Management
router.post('/admins', protect, admin, createAdmin);

// Finance
router.get('/finance/overview', protect, admin, getFinanceOverview);
router.get('/finance/user-averages', protect, admin, getUserAverages);

export default router;
