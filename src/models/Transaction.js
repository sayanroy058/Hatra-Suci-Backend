import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'referral', 'daily_reward', 'bonus', 'level_reward'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'rejected', 'cancelled'],
    default: 'pending',
  },
  transactionHash: {
    type: String,
    default: '',
  },
  walletAddress: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  adminNotes: {
    type: String,
    default: '',
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
