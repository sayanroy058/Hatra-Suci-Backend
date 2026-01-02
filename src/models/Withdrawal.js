import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing'],
    default: 'pending',
  },
  transactionHash: {
    type: String,
    default: '',
  },
  adminNotes: {
    type: String,
    default: '',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;
