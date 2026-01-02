import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referred: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  commission: {
    type: Number,
    default: 0,
  },
  commissionRate: {
    type: Number,
    default: 10, // 10% commission
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  side: {
    type: String,
    enum: ['left', 'right'],
    required: true,
  },
}, {
  timestamps: true,
});

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
