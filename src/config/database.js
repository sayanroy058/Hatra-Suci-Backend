import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings for high concurrency
      maxPoolSize: 100, // Maximum 100 connections in pool
      minPoolSize: 10,  // Minimum 10 connections always available
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      
      // Performance optimizations
      autoIndex: process.env.NODE_ENV === 'development', // Only auto-create indexes in dev
      maxIdleTimeMS: 10000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Connection pool configured: min=10, max=100`);
    
    // Create indexes for better query performance
    await createIndexes();
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create database indexes for frequently queried fields
const createIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true, background: true });
    await db.collection('users').createIndex({ referralCode: 1 }, { unique: true, background: true });
    await db.collection('users').createIndex({ referredBy: 1 }, { background: true });
    await db.collection('users').createIndex({ isActive: 1 }, { background: true });
    await db.collection('users').createIndex({ createdAt: -1 }, { background: true });
    
    // Referral indexes
    await db.collection('referrals').createIndex({ referrer: 1 }, { background: true });
    await db.collection('referrals').createIndex({ referred: 1 }, { background: true });
    await db.collection('referrals').createIndex({ referrer: 1, side: 1 }, { background: true });
    
    // Transaction indexes
    await db.collection('transactions').createIndex({ user: 1, createdAt: -1 }, { background: true });
    await db.collection('transactions').createIndex({ type: 1 }, { background: true });
    
    // Deposit indexes
    await db.collection('deposits').createIndex({ user: 1, createdAt: -1 }, { background: true });
    await db.collection('deposits').createIndex({ status: 1 }, { background: true });
    
    // Withdrawal indexes
    await db.collection('withdrawals').createIndex({ user: 1, createdAt: -1 }, { background: true });
    await db.collection('withdrawals').createIndex({ status: 1 }, { background: true });
    
    // Settings indexes
    await db.collection('settings').createIndex({ key: 1 }, { unique: true, background: true });
    
    console.log('✓ Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error.message);
  }
};

export default connectDB;
