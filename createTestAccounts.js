import mongoose from 'mongoose';
import User from './src/models/User.js';
import Deposit from './src/models/Deposit.js';
import Transaction from './src/models/Transaction.js';
import Referral from './src/models/Referral.js';
import dotenv from 'dotenv';

dotenv.config();

async function createTestAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find referrer by referral code
    const referrer = await User.findOne({ referralCode: 'TESTM771PE' });
    if (!referrer) {
      console.log('❌ Referral code TESTM771PE not found');
      process.exit(1);
    }

    console.log('✅ Found referrer:', referrer.username, referrer.email);
    console.log('');

    // Create 12 test accounts
    const testUsers = [];
    for (let i = 1; i <= 12; i++) {
      const username = `testuser${i}_${Date.now()}`;
      const email = `testuser${i}_${Date.now()}@test.com`;
      const password = 'Test123456';

      const user = await User.create({
        username,
        email,
        password,
        referredBy: referrer._id,
        isActive: false,
        registrationDepositPaid: false,
        registrationDepositVerified: false,
      });

      testUsers.push(user);
      console.log(`✅ Created user ${i}: ${username} (${email})`);

      // Determine side (alternating left/right)
      const totalReferrals = await Referral.countDocuments({ referrer: referrer._id });
      const side = totalReferrals % 2 === 0 ? 'left' : 'right';

      // Create referral relationship
      await Referral.create({
        referrer: referrer._id,
        referred: user._id,
        side,
        isActive: false,
      });

      console.log(`  ➜ Created referral on ${side} side`);

      // Create registration deposit
      const dummyTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      const depositAmount = 90; // 90 USD registration deposit

      const deposit = await Deposit.create({
        user: user._id,
        amount: depositAmount,
        transactionHash: dummyTxHash,
        walletAddress: '0x1ab174ddf2fb97bd3cf3362a98b103a6f3852a67',
        proof: '',
        isRegistrationDeposit: true,
        status: 'pending',
      });

      console.log(`  ➜ Created deposit: $${depositAmount} - TX: ${dummyTxHash.substr(0, 20)}...`);

      // Create transaction record
      await Transaction.create({
        user: user._id,
        type: 'deposit',
        amount: depositAmount,
        transactionHash: dummyTxHash,
        walletAddress: '0x1ab174ddf2fb97bd3cf3362a98b103a6f3852a67',
        status: 'pending',
        description: 'Registration deposit',
      });

      console.log(`  ➜ Created transaction record`);
      console.log('');
    }

    console.log('✅ Successfully created 12 test accounts with pending registration deposits');
    console.log('');
    console.log('Summary:');
    console.log(`  Referrer: ${referrer.username} (${referrer.email})`);
    console.log(`  Referral Code: TESTM771PE`);
    console.log(`  Test Accounts Created: 12`);
    console.log(`  Pending Deposits: 12 x $90 = $1080`);
    console.log('');
    console.log('⚠️  All deposits are pending admin verification');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestAccounts();
