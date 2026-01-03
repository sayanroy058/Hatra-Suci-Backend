import Deposit from '../models/Deposit.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import { getSetting, getSettings } from '../utils/settingsHelper.js';

// @desc    Create deposit request
// @route   POST /api/user/deposits
// @access  Private
export const createDeposit = async (req, res) => {
  try {
    const { amount, transactionHash, walletAddress, proof } = req.body;

    // Check if deposits are enabled (with caching)
    const Settings = (await import('../models/Settings.js')).default;
    const depositsEnabled = await getSetting(Settings, 'depositsEnabled', true);
    
    if (!depositsEnabled) {
      return res.status(403).json({ 
        message: 'Deposits are currently disabled. Please try again later.',
        depositsDisabled: true
      });
    }

    const deposit = await Deposit.create({
      user: req.user._id,
      amount,
      transactionHash,
      walletAddress,
      proof,
    });

    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'deposit',
      amount,
      transactionHash,
      walletAddress,
      status: 'pending',
      description: 'Deposit request',
    });

    res.status(201).json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user deposits
// @route   GET /api/user/deposits
// @access  Private
export const getDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'username email')
      .lean();

    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create withdrawal request
// @route   POST /api/user/withdrawals
// @access  Private
export const createWithdrawal = async (req, res) => {
  try {
    const { amount, walletAddress } = req.body;
    
    // Check if withdrawals are enabled and get lock settings (with caching)
    const Settings = (await import('../models/Settings.js')).default;
    const settings = await getSettings(Settings, 
      ['withdrawalsEnabled', 'withdrawLockAmount', 'withdrawLockDays'],
      { withdrawalsEnabled: true, withdrawLockAmount: 65, withdrawLockDays: 90 }
    );
    
    if (!settings.withdrawalsEnabled) {
      return res.status(403).json({ 
        message: 'Withdrawals are currently disabled. Please try again later.',
        withdrawalsDisabled: true
      });
    }
    
    const user = await User.findById(req.user._id);

    const lockAmount = settings.withdrawLockAmount;
    const lockDays = settings.withdrawLockDays;
    
    // Calculate days since account creation
    const accountAge = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const isWithinLockPeriod = accountAge < lockDays;
    
    // Calculate available balance (balance minus locked amount if within lock period)
    const availableBalance = isWithinLockPeriod ? Math.max(0, user.balance - lockAmount) : user.balance;
    
    // Check if withdrawal would dip into locked amount
    if (isWithinLockPeriod && amount > availableBalance) {
      const unlockDate = new Date(new Date(user.createdAt).getTime() + lockDays * 24 * 60 * 60 * 1000);
      return res.status(400).json({ 
        message: `$${lockAmount} is locked for ${lockDays} days from account creation. Available to withdraw: $${availableBalance.toFixed(2)}`,
        lockedAmount: lockAmount,
        availableBalance: availableBalance,
        unlockDate: unlockDate,
        daysRemaining: lockDays - accountAge
      });
    }

    // Check if user has sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const withdrawal = await Withdrawal.create({
      user: req.user._id,
      amount,
      walletAddress,
    });

    // Deduct balance temporarily
    user.balance -= amount;
    await user.save();

    // Create transaction record
    await Transaction.create({
      user: req.user._id,
      type: 'withdrawal',
      amount,
      walletAddress,
      status: 'pending',
      description: 'Withdrawal request',
    });

    res.status(201).json(withdrawal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user withdrawals
// @route   GET /api/user/withdrawals
// @access  Private
export const getWithdrawals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email')
        .lean(),
      Withdrawal.countDocuments({ user: req.user._id })
    ]);

    res.json({
      data: withdrawals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user transactions
// @route   GET /api/user/transactions
// @access  Private
export const getTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'username email')
        .lean(),
      Transaction.countDocuments({ user: req.user._id })
    ]);

    res.json({
      data: transactions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user referrals
// @route   GET /api/user/referrals
// @access  Private
export const getReferrals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const Referral = (await import('../models/Referral.js')).default;
    
    const [referrals, total] = await Promise.all([
      Referral.find({ referrer: req.user._id })
        .populate('referred', 'username email createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Referral.countDocuments({ referrer: req.user._id })
    ]);

    // Normalize referrals: assign default 'left' side when absent (legacy data)
    const normalizedReferrals = referrals.map(ref => ({
      ...ref,
      side: ref.side || 'left'
    }));

    res.json({
      data: normalizedReferrals,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Level rewards configuration
const LEVEL_REWARDS = [
  { level: 0, leftRequired: 0, rightRequired: 0, reward: 0 },
  { level: 1, leftRequired: 1, rightRequired: 1, reward: 11 },
  { level: 2, leftRequired: 6, rightRequired: 6, reward: 67 },
  { level: 3, leftRequired: 12, rightRequired: 12, reward: 89 },
  { level: 4, leftRequired: 25, rightRequired: 25, reward: 167 },
  { level: 5, leftRequired: 50, rightRequired: 50, reward: 278 },
  { level: 6, leftRequired: 75, rightRequired: 75, reward: 389 },
  { level: 7, leftRequired: 120, rightRequired: 120, reward: 556 },
  { level: 8, leftRequired: 160, rightRequired: 160, reward: 1333 },
  { level: 9, leftRequired: 220, rightRequired: 220, reward: 1667 },
  { level: 10, leftRequired: 300, rightRequired: 300, reward: 2500 },
  { level: 11, leftRequired: 500, rightRequired: 500, reward: 8889 },
  { level: 12, leftRequired: 1500, rightRequired: 1500, reward: 50000 },
];

// @desc    Process level rewards for a user (internal function)
// @access  Internal - Called by various controllers
export const processLevelRewards = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { error: 'User not found' };
    
    // Guard: Initialize achievedLevels if it doesn't exist
    if (!user.achievedLevels) {
      user.achievedLevels = [];
    }
    
    const Referral = (await import('../models/Referral.js')).default;

    // Count left and right team members (only active referrals)
    const leftCount = await Referral.countDocuments({ 
      referrer: userId, 
      side: 'left',
      isActive: true 
    });
    const rightCount = await Referral.countDocuments({ 
      referrer: userId, 
      side: 'right',
      isActive: true 
    });

    const newLevelsAchieved = [];
    
    // Check each level starting from level 1
    for (const levelConfig of LEVEL_REWARDS) {
      if (levelConfig.level === 0 || levelConfig.reward === 0) continue;
      
      // Skip if already achieved (using guarded array)
      if (user.achievedLevels.includes(levelConfig.level)) continue;
      
      // Check if requirements are met
      if (leftCount >= levelConfig.leftRequired && rightCount >= levelConfig.rightRequired) {
        // Award the level
        user.balance += levelConfig.reward;
        user.achievedLevels.push(levelConfig.level);
        
        // Create transaction record
        await Transaction.create({
          user: userId,
          type: 'level_reward',
          amount: levelConfig.reward,
          status: 'completed',
          description: `Level ${levelConfig.level} achievement reward: $${levelConfig.reward} (L: ${leftCount}, R: ${rightCount})`,
        });
        
        newLevelsAchieved.push({
          level: levelConfig.level,
          reward: levelConfig.reward
        });
      }
    }
    
    if (newLevelsAchieved.length > 0) {
      await user.save();
    }

    return {
      leftCount,
      rightCount,
      achievedLevels: user.achievedLevels,
      newLevelsAchieved,
      balance: user.balance
    };
  } catch (error) {
    console.error('Error processing level rewards:', error);
    return { error: error.message };
  }
};

// @desc    Check and award level rewards
// @route   POST /api/user/level-rewards/check
// @access  Private
export const checkLevelRewards = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Guard: Initialize achievedLevels if it doesn't exist
    if (!user.achievedLevels) {
      user.achievedLevels = [];
    }
    const Referral = (await import('../models/Referral.js')).default;

    // Count left and right team members
    const leftCount = await Referral.countDocuments({ 
      referrer: req.user._id, 
      side: 'left',
      isActive: true 
    });
    const rightCount = await Referral.countDocuments({ 
      referrer: req.user._id, 
      side: 'right',
      isActive: true 
    });

    const newLevelsAchieved = [];
    
    // Check each level starting from level 1
    for (const levelConfig of LEVEL_REWARDS) {
      if (levelConfig.level === 0 || levelConfig.reward === 0) continue;
      
      // Skip if already achieved (using guarded array)
      if (user.achievedLevels.includes(levelConfig.level)) continue;
      
      // Check if requirements are met
      if (leftCount >= levelConfig.leftRequired && rightCount >= levelConfig.rightRequired) {
        // Award the level
        user.balance += levelConfig.reward;
        user.achievedLevels.push(levelConfig.level);
        
        // Create transaction record
        await Transaction.create({
          user: req.user._id,
          type: 'level_reward',
          amount: levelConfig.reward,
          status: 'completed',
          description: `Level ${levelConfig.level} achievement reward: $${levelConfig.reward} (L: ${leftCount}, R: ${rightCount})`,
        });
        
        newLevelsAchieved.push({
          level: levelConfig.level,
          reward: levelConfig.reward
        });
      }
    }
    
    if (newLevelsAchieved.length > 0) {
      await user.save();
    }

    res.json({
      leftCount,
      rightCount,
      achievedLevels: user.achievedLevels,
      newLevelsAchieved,
      balance: user.balance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Spin wheel (scratch card)
// @route   POST /api/user/spin-wheel
// @access  Private
export const spinWheel = async (req, res) => {
  try {
    const { reward: requestedReward } = req.body;
    const user = await User.findById(req.user._id);

    // Check if user can spin (once per day - resets at midnight)
    const lastSpin = user.spinWheelLastUsed;
    const now = new Date();
    
    // Calculate start of today (midnight)
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    
    // Calculate start of tomorrow (next midnight)
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    
    if (lastSpin) {
      const lastSpinDate = new Date(lastSpin);
      // Check if last spin was today (same calendar day)
      if (lastSpinDate >= startOfToday) {
        return res.status(400).json({ 
          message: 'You can only spin once per day. Next spin available at midnight.',
          nextSpinTime: startOfTomorrow
        });
      }
    }

    // Load reward limits from settings
    const Settings = (await import('../models/Settings.js')).default;
    let minRewardSetting = await Settings.findOne({ key: 'minDailyReward' });
    let maxRewardSetting = await Settings.findOne({ key: 'maxDailyReward' });
    
    // Generate reward on server-side (never trust client input)
    // Random between min and max with four-decimal precision
    const minReward = minRewardSetting?.value || 0.5;
    const maxReward = maxRewardSetting?.value || 0.8;
    const reward = parseFloat((minReward + Math.random() * (maxReward - minReward)).toFixed(4));

    // Update user
    user.balance += reward;
    user.spinWheelLastUsed = now;
    user.spinWheelCount += 1;
    await user.save();

    // Create transaction
    await Transaction.create({
      user: req.user._id,
      type: 'daily_reward',
      amount: reward,
      status: 'completed',
      description: `Daily scratch card reward: $${reward.toFixed(4)}`,
    });

    res.json({
      reward,
      newBalance: user.balance,
      spinCount: user.spinWheelCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
