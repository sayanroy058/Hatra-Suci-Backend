import mongoose from 'mongoose';

const depositSchema = new mongoose.Schema({
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
  transactionHash: {
    type: String,
    required: true,
  },
  walletAddress: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  proof: {
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
  isRegistrationDeposit: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const Deposit = mongoose.model('Deposit', depositSchema);

export default Deposit;
