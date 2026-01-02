import User from '../models/User.js';
import Deposit from '../models/Deposit.js';
import Withdrawal from '../models/Withdrawal.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import Referral from '../models/Referral.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Use aggregation to avoid N+1 queries
    const [users, total] = await Promise.all([
      User.aggregate([
        { $match: {} },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'referrals',
            localField: '_id',
            foreignField: 'referrer',
            as: 'referrals'
          }
        },
        {
          $lookup: {
            from: 'referrals',
            localField: '_id',
            foreignField: 'referred',
            as: 'referredByData'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'referredByData.referrer',
            foreignField: '_id',
            as: 'referrerInfo'
          }
        },
        {
          $addFields: {
            referralCount: { $size: '$referrals' },
            currentLevel: {
              $cond: {
                if: { $isArray: '$achievedLevels' },
                then: { $max: { $concatArrays: ['$achievedLevels', [0]] } },
                else: 0
              }
            },
            referredBy: {
              $cond: {
                if: { $gt: [{ $size: '$referrerInfo' }, 0] },
                then: {
                  username: { $arrayElemAt: ['$referrerInfo.username', 0] },
                  email: { $arrayElemAt: ['$referrerInfo.email', 0] },
                  referralCode: { $arrayElemAt: ['$referrerInfo.referralCode', 0] }
                },
                else: null
              }
            }
          }
        },
        {
          $project: {
            password: 0,
            referrals: 0,
            referredByData: 0,
            referrerInfo: 0
          }
        }
      ]),
      User.countDocuments({})
    ]);

    res.json({
      data: users,
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

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (user) {
      // Add referral count and current level
      const referralCount = await Referral.countDocuments({ referrer: user._id });
      
      // Find who referred this user
      const referralRecord = await Referral.findOne({ referred: user._id }).populate('referrer', 'username email referralCode');
      const referredBy = referralRecord?.referrer ? {
        username: referralRecord.referrer.username,
        email: referralRecord.referrer.email,
        referralCode: referralRecord.referrer.referralCode
      } : null;
      
      // Normalize achievedLevels to array and calculate currentLevel
      const achievedLevels = Array.isArray(user.achievedLevels) ? user.achievedLevels : [];
      const currentLevel = achievedLevels.length > 0 ? Math.max(...achievedLevels) : 0;
      
      const enhancedUser = {
        ...user.toObject(),
        referralCount,
        currentLevel,
        referredBy
      };
      
      res.json(enhancedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.balance = req.body.balance !== undefined ? req.body.balance : user.balance;
      user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
      user.isAdmin = req.body.isAdmin !== undefined ? req.body.isAdmin : user.isAdmin;

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all deposits
// @route   GET /api/admin/deposits
// @access  Private/Admin
export const getAllDeposits = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [deposits, total] = await Promise.all([
      Deposit.find({})
        .populate('user', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Deposit.countDocuments({})
    ]);

    res.json({
      data: deposits,
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

// @desc    Approve/Reject deposit
// @route   PUT /api/admin/deposits/:id
// @access  Private/Admin
export const updateDeposit = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ message: 'Deposit not found' });
    }

    // Registration deposits should be handled by verifyRegistrationDeposit endpoint
    if (deposit.isRegistrationDeposit) {
      return res.status(400).json({ 
        message: 'Registration deposits must be verified through the registration verification endpoint' 
      });
    }

    deposit.status = status;
    deposit.adminNotes = adminNotes || deposit.adminNotes;
    deposit.approvedBy = req.user._id;
    deposit.approvedAt = new Date();

    await deposit.save();

    // Update user balance if approved (regular deposits only)
    if (status === 'approved') {
      const user = await User.findById(deposit.user);
      user.balance += deposit.amount;
      user.totalDeposits += deposit.amount;
      await user.save();

      // Update transaction
      await Transaction.findOneAndUpdate(
        { user: deposit.user, type: 'deposit', amount: deposit.amount, status: 'pending' },
        { status: 'completed', processedBy: req.user._id, processedAt: new Date() }
      );
    } else if (status === 'rejected') {
      // Update transaction
      await Transaction.findOneAndUpdate(
        { user: deposit.user, type: 'deposit', amount: deposit.amount, status: 'pending' },
        { status: 'rejected', processedBy: req.user._id, processedAt: new Date() }
      );
    }

    res.json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all withdrawals
// @route   GET /api/admin/withdrawals
// @access  Private/Admin
export const getAllWithdrawals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find({})
        .populate('user', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Withdrawal.countDocuments({})
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

// @desc    Approve/Reject withdrawal
// @route   PUT /api/admin/withdrawals/:id
// @access  Private/Admin
export const updateWithdrawal = async (req, res) => {
  try {
    const { status, transactionHash, adminNotes } = req.body;
    const withdrawal = await Withdrawal.findById(req.params.id);

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    withdrawal.status = status;
    withdrawal.transactionHash = transactionHash || withdrawal.transactionHash;
    withdrawal.adminNotes = adminNotes || withdrawal.adminNotes;
    withdrawal.approvedBy = req.user._id;
    withdrawal.approvedAt = new Date();

    await withdrawal.save();

    // If rejected, return balance to user
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.user);
      user.balance += withdrawal.amount;
      await user.save();

      await Transaction.findOneAndUpdate(
        { user: withdrawal.user, type: 'withdrawal', amount: withdrawal.amount, status: 'pending' },
        { status: 'rejected', processedBy: req.user._id, processedAt: new Date() }
      );
    } else if (status === 'approved') {
      const user = await User.findById(withdrawal.user);
      user.totalWithdrawals += withdrawal.amount;
      await user.save();

      await Transaction.findOneAndUpdate(
        { user: withdrawal.user, type: 'withdrawal', amount: withdrawal.amount, status: 'pending' },
        { status: 'completed', transactionHash, processedBy: req.user._id, processedAt: new Date() }
      );
    }

    res.json(withdrawal);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private/Admin
export const getAllTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      Transaction.find({})
        .populate('user', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments({})
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

// @desc    Get recent transactions for dashboard
// @route   GET /api/admin/transactions/recent
// @access  Private/Admin
export const getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const transactions = await Transaction.find({})
      .populate('user', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalDeposits = await Deposit.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalWithdrawals = await Withdrawal.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingDeposits = await Deposit.countDocuments({ status: 'pending', isRegistrationDeposit: { $ne: true } });
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const pendingRegistrations = await Deposit.countDocuments({ status: 'pending', isRegistrationDeposit: true });

    res.json({
      totalUsers,
      activeUsers,
      totalDeposits: totalDeposits[0]?.total || 0,
      totalWithdrawals: totalWithdrawals[0]?.total || 0,
      pendingDeposits,
      pendingWithdrawals,
      pendingRegistrations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get settings
// @route   GET /api/admin/settings
// @access  Private/Admin
export const getSettings = async (req, res) => {
  try {
    const settings = await Settings.find({});
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
export const updateSettings = async (req, res) => {
  try {
    // Support both single and batch updates
    const isBatch = Array.isArray(req.body);
    
    if (isBatch) {
      // Batch update mode
      const settingsToUpdate = req.body;
      const results = [];
      
      for (const { key, value, description } of settingsToUpdate) {
        let setting = await Settings.findOne({ key });
        
        if (setting) {
          setting.value = value;
          setting.description = description || setting.description;
          await setting.save();
        } else {
          setting = await Settings.create({ key, value, description });
        }
        
        results.push(setting);
      }
      
      return res.json({ 
        message: `${results.length} settings updated successfully`,
        settings: results 
      });
    } else {
      // Single update mode (backward compatibility)
      const { key, value, description } = req.body;
      
      let setting = await Settings.findOne({ key });

      if (setting) {
        setting.value = value;
        setting.description = description || setting.description;
        await setting.save();
      } else {
        setting = await Settings.create({ key, value, description });
      }

      return res.json(setting);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending registration deposits
// @route   GET /api/admin/registration-deposits
// @access  Private/Admin
export const getPendingRegistrations = async (req, res) => {
  try {
    const deposits = await Deposit.find({ 
      isRegistrationDeposit: true,
      status: 'pending'
    })
      .populate('user', 'username email isActive')
      .sort({ createdAt: -1 });

    res.json(deposits);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify registration deposit
// @route   PUT /api/admin/registration-deposits/:id
// @access  Private/Admin
export const verifyRegistrationDeposit = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const deposit = await Deposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ message: 'Registration deposit not found' });
    }

    if (!deposit.isRegistrationDeposit) {
      return res.status(400).json({ message: 'This is not a registration deposit' });
    }

    deposit.status = status;
    deposit.adminNotes = adminNotes || deposit.adminNotes;
    deposit.approvedBy = req.user._id;
    deposit.approvedAt = new Date();

    await deposit.save();

    const user = await User.findById(deposit.user);

    if (status === 'approved') {
      // Activate user account and credit balance
      user.isActive = true;
      user.registrationDepositVerified = true;
      user.balance += deposit.amount;
      user.totalDeposits += deposit.amount;
      await user.save();

      // Activate the referral relationship
      const Referral = (await import('../models/Referral.js')).default;
      await Referral.updateOne(
        { referred: deposit.user },
        { isActive: true }
      );
      
      // Get the referrer and automatically process their level rewards
      const referral = await Referral.findOne({ referred: deposit.user });
      if (referral && referral.referrer) {
        // Import and call the level rewards processing function
        const { processLevelRewards } = await import('./userController.js');
        await processLevelRewards(referral.referrer);
      }

      // Create transaction record
      await Transaction.findOneAndUpdate(
        { user: deposit.user, type: 'deposit', amount: deposit.amount, status: 'pending' },
        { status: 'completed', processedBy: req.user._id, processedAt: new Date() }
      );
    } else if (status === 'rejected') {
      // Keep user inactive and referral inactive
      user.isActive = false;
      user.registrationDepositVerified = false;
      await user.save();
      
      // Ensure referral stays inactive
      const Referral = (await import('../models/Referral.js')).default;
      await Referral.updateOne(
        { referred: deposit.user },
        { isActive: false }
      );

      // Update transaction
      await Transaction.findOneAndUpdate(
        { user: deposit.user, type: 'deposit', amount: deposit.amount, status: 'pending' },
        { status: 'rejected', processedBy: req.user._id, processedAt: new Date() }
      );
    }

    res.json(deposit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Credit bonus to user
// @route   POST /api/admin/bonus
// @access  Private/Admin
export const creditBonus = async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid userId and positive amount are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user balance
    user.balance += amount;
    await user.save();

    // Create bonus transaction
    await Transaction.create({
      user: userId,
      type: 'bonus',
      amount,
      status: 'completed',
      description: description || `Admin bonus: $${amount.toFixed(2)}`,
      processedBy: req.user._id,
      processedAt: new Date(),
    });

    res.json({
      message: 'Bonus credited successfully',
      newBalance: user.balance,
      amount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Create new admin
// @route   POST /api/admin/admins
// @access  Private/Admin
export const createAdmin = async (req, res) => {
  try {
    const { username, email, password, role, passcode } = req.body;

    // Verify passcode
    const requiredPasscode = process.env.ADMIN_CREATE_PASSCODE;
    
    if (!requiredPasscode) {
      return res.status(500).json({ 
        message: 'Admin creation is not configured. Contact system administrator.' 
      });
    }

    if (!passcode) {
      return res.status(401).json({ 
        message: 'Admin creation passcode is required.' 
      });
    }

    if (passcode !== requiredPasscode) {
      return res.status(403).json({ 
        message: 'Invalid admin creation passcode.' 
      });
    }

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required.' 
      });
    }

    // Check if admin already exists
    const Admin = (await import('../models/Admin.js')).default;
    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Admin with this email or username already exists.' 
      });
    }

    // Create new admin
    const newAdmin = await Admin.create({
      username,
      email,
      password,
      role: role || 'admin',
      isActive: true,
    });

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        _id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get finance overview
// @route   GET /api/admin/finance/overview
// @access  Private/Admin
export const getFinanceOverview = async (req, res) => {
  try {
    const [totalUsers, approvedDeposits, approvedWithdrawals, completedBonuses] = await Promise.all([
      User.countDocuments(),
      Deposit.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: { $in: ['bonus', 'daily_reward', 'level_reward', 'referral'] }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalDeposits = approvedDeposits[0]?.total || 0;
    const totalWithdrawals = approvedWithdrawals[0]?.total || 0;
    const totalBonuses = completedBonuses[0]?.total || 0;
    const available = totalDeposits - totalWithdrawals - totalBonuses;

    res.json({
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      totalBonuses,
      available
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get per-user weighted averages over a period
// @route   GET /api/admin/finance/user-averages
// @access  Private/Admin
export const getUserAverages = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodEnd.getDate() - days);

    // Get paginated users
    const [users, totalUsers] = await Promise.all([
      User.find({})
        .select('_id username email createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments({})
    ]);

    // Helper to get all relevant transactions for users in the period
    const transactionsData = await Transaction.aggregate([
      { 
        $match: { 
          type: { $in: ['deposit', 'withdrawal', 'bonus', 'daily_reward', 'level_reward', 'referral'] },
          status: 'completed',
          createdAt: { $gte: periodStart }
        } 
      },
      { 
        $group: {
          _id: '$user',
          transactions: { $push: '$$ROOT' }
        }
      }
    ]);

    // Map transactions per user for easy lookup
    const transactionsMap = new Map(transactionsData.map(d => [d._id.toString(), d.transactions]));

    const baseline = 65 * days;
    const userAverages = users.map(user => {
      const userId = user._id.toString();
      const userTransactions = transactionsMap.get(userId) || [];

      let weightedTotal = 0;

      userTransactions.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        // Number of days the transaction is "active" in the period
        const activeDays = Math.max(0, Math.ceil((periodEnd - txDate) / (1000 * 60 * 60 * 24)));
        if (activeDays > days) return; // Ignore transactions before period start
        const daysCount = Math.min(activeDays, days);

        if (tx.type === 'deposit' || ['bonus', 'daily_reward', 'level_reward', 'referral'].includes(tx.type)) {
          weightedTotal += tx.amount * daysCount;
        } else if (tx.type === 'withdrawal') {
          weightedTotal -= tx.amount * daysCount;
        }
      });

      const averagePerDay = weightedTotal / days;
      const deltaPerDay = averagePerDay - 65;

      // Sum deposits, withdrawals, bonuses separately
      const depositsLast30 = userTransactions
        .filter(t => t.type === 'deposit')
        .reduce((sum, t) => sum + t.amount, 0);
      const withdrawalsLast30 = userTransactions
        .filter(t => t.type === 'withdrawal')
        .reduce((sum, t) => sum + t.amount, 0);
      const bonusesLast30 = userTransactions
        .filter(t => ['bonus', 'daily_reward', 'level_reward', 'referral'].includes(t.type))
        .reduce((sum, t) => sum + t.amount, 0);

      const availableLast30 = depositsLast30 - withdrawalsLast30 - bonusesLast30;

      return {
        userId: user._id,
        username: user.username,
        email: user.email,
        depositsLast30,
        withdrawalsLast30,
        bonusesLast30,
        availableLast30: parseFloat(availableLast30.toFixed(2)),
        weightedTotal: parseFloat(weightedTotal.toFixed(2)),
        averagePerDay: parseFloat(averagePerDay.toFixed(2)),
        deltaPerDay: parseFloat(deltaPerDay.toFixed(2))
      };
    });

    res.json({
      days,
      baseline,
      users: userAverages,
      pagination: {
        total: totalUsers,
        page,
        limit,
        pages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
