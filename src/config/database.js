import mongoose from 'mongoose';

// Singleton connection cache for serverless
let cachedConnection = null;

const connectDB = async () => {
  // Reuse existing connection if available
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log('Using cached MongoDB connection');
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Optimized pool settings for serverless/free tier
      maxPoolSize: 5,  // Reduced for serverless and free tier
      minPoolSize: 0,  // No minimum for serverless cold starts
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      
      // Performance optimizations
      autoIndex: process.env.NODE_ENV === 'development',
      maxIdleTimeMS: 10000,
    });
    
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Connection pool configured: min=0, max=5 (serverless optimized)`);
    
    // Only create indexes if explicitly enabled via env flag
    if (process.env.CREATE_INDEXES_ON_START === 'true') {
      await createIndexes();
    } else {
      console.log('Skipping index creation (set CREATE_INDEXES_ON_START=true to enable)');
    }
    
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
