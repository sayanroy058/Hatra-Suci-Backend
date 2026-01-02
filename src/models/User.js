import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: 3,
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  walletAddress: {
    type: String,
    default: '',
  },
  balance: {
    type: Number,
    default: 0,
  },
  totalDeposits: {
    type: Number,
    default: 0,
  },
  totalWithdrawals: {
    type: Number,
    default: 0,
  },
  referralCode: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  referralEarnings: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  registrationDepositPaid: {
    type: Boolean,
    default: false,
  },
  registrationDepositVerified: {
    type: Boolean,
    default: false,
  },
  registrationDepositAmount: {
    type: Number,
    default: 0,
  },
  lastLogin: {
    type: Date,
  },
  spinWheelLastUsed: {
    type: Date,
  },
  spinWheelCount: {
    type: Number,
    default: 0,
  },
  achievedLevels: {
    type: [Number],
    default: [],
  },
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = this.username.toUpperCase() + Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User;
