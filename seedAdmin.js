import mongoose from 'mongoose';
import Admin from './src/models/Admin.js';
import dotenv from 'dotenv';

dotenv.config();

const seedAdmin = async () => {
  try {
    // Validate required environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';

    if (!adminEmail || !adminPassword) {
      console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file');
      console.error('Please set the following environment variables:');
      console.error('  ADMIN_EMAIL=your_admin@email.com');
      console.error('  ADMIN_PASSWORD=your_secure_password');
      console.error('  ADMIN_USERNAME=admin (optional, defaults to "admin")');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin already exists with email:', adminEmail);
      process.exit(0);
    }

    // Create admin
    const admin = await Admin.create({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      role: 'superadmin',
    });

    console.log('✅ Admin created successfully');
    console.log('Email:', adminEmail);
    console.log('Username:', adminUsername);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seedAdmin();
