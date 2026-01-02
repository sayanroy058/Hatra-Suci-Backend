# Hatra Suci Backend API Documentation

## Overview
This is the backend API for the Hatra Suci platform, built with Node.js, Express, MongoDB, and JWT authentication.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (running on port 27017) or Docker
- npm or yarn

### Installation

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/hatra-suci
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRE=30d
NODE_ENV=development
ADMIN_EMAIL=admin@hatrasuci.com
ADMIN_PASSWORD=admin123
```

4. Start MongoDB (Docker):
```bash
docker run -d -p 27017:27017 --name hatra-suci-mongodb mongo:latest
```

5. Start the backend server:
```bash
npm run dev
```

The backend server will run on `http://localhost:5000`

## API Endpoints

### Authentication Routes (`/api/auth`)

#### Register User
- **POST** `/api/auth/register`
- **Body**:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "referralCode": "OPTIONAL123" 
}
```
- **Response**:
```json
{
  "_id": "...",
  "username": "johndoe",
  "email": "john@example.com",
  "referralCode": "JOHNDOEABC123",
  "isAdmin": false,
  "token": "jwt_token_here"
}
```

#### Login
- **POST** `/api/auth/login`
- **Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Profile
- **GET** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`

#### Update Profile
- **PUT** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
```json
{
  "username": "newusername",
  "email": "newemail@example.com",
  "walletAddress": "0x...",
  "password": "newpassword"
}
```

### User Routes (`/api/user`)
All user routes require authentication via Bearer token.

#### Deposits
- **GET** `/api/user/deposits` - Get user's deposits
- **POST** `/api/user/deposits` - Create deposit request
```json
{
  "amount": 100,
  "transactionHash": "0x...",
  "walletAddress": "0x...",
  "proof": "image_url_or_base64"
}
```

#### Withdrawals
- **GET** `/api/user/withdrawals` - Get user's withdrawals
- **POST** `/api/user/withdrawals` - Create withdrawal request
```json
{
  "amount": 50,
  "walletAddress": "0x..."
}
```

#### Transactions
- **GET** `/api/user/transactions` - Get user's transaction history

#### Referrals
- **GET** `/api/user/referrals` - Get user's referrals and earnings

#### Spin Wheel
- **POST** `/api/user/spin-wheel` - Spin the reward wheel (once per day)

### Admin Routes (`/api/admin`)
All admin routes require admin authentication.

#### User Management
- **GET** `/api/admin/users` - Get all users
- **GET** `/api/admin/users/:id` - Get user by ID
- **PUT** `/api/admin/users/:id` - Update user
- **DELETE** `/api/admin/users/:id` - Delete user

#### Deposit Management
- **GET** `/api/admin/deposits` - Get all deposits
- **PUT** `/api/admin/deposits/:id` - Approve/Reject deposit
```json
{
  "status": "approved", // or "rejected"
  "adminNotes": "Optional notes"
}
```

#### Withdrawal Management
- **GET** `/api/admin/withdrawals` - Get all withdrawals
- **PUT** `/api/admin/withdrawals/:id` - Approve/Reject withdrawal
```json
{
  "status": "approved", // or "rejected"
  "transactionHash": "0x...",
  "adminNotes": "Optional notes"
}
```

#### Transactions
- **GET** `/api/admin/transactions` - Get all transactions

#### Dashboard Stats
- **GET** `/api/admin/stats` - Get dashboard statistics
```json
{
  "totalUsers": 100,
  "activeUsers": 95,
  "totalDeposits": 10000,
  "totalWithdrawals": 5000,
  "pendingDeposits": 5,
  "pendingWithdrawals": 3
}
```

#### Settings
- **GET** `/api/admin/settings` - Get all settings
- **PUT** `/api/admin/settings` - Update settings
```json
{
  "key": "referral_commission_rate",
  "value": 10,
  "description": "Referral commission percentage"
}
```

## Database Models

### User
- username (String, unique, required)
- email (String, unique, required)
- password (String, hashed, required)
- walletAddress (String)
- balance (Number, default: 0)
- totalDeposits (Number, default: 0)
- totalWithdrawals (Number, default: 0)
- referralCode (String, unique, auto-generated)
- referredBy (ObjectId, ref: User)
- referralEarnings (Number, default: 0)
- isAdmin (Boolean, default: false)
- isActive (Boolean, default: true)
- lastLogin (Date)
- spinWheelLastUsed (Date)
- spinWheelCount (Number, default: 0)

### Transaction
- user (ObjectId, ref: User)
- type (enum: deposit, withdrawal, referral, spin_reward, bonus)
- amount (Number)
- status (enum: pending, completed, rejected, cancelled)
- transactionHash (String)
- walletAddress (String)
- description (String)
- adminNotes (String)
- processedBy (ObjectId, ref: User)
- processedAt (Date)

### Deposit
- user (ObjectId, ref: User)
- amount (Number)
- transactionHash (String)
- walletAddress (String)
- status (enum: pending, approved, rejected)
- proof (String)
- adminNotes (String)
- approvedBy (ObjectId, ref: User)
- approvedAt (Date)

### Withdrawal
- user (ObjectId, ref: User)
- amount (Number)
- walletAddress (String)
- status (enum: pending, approved, rejected, processing)
- transactionHash (String)
- adminNotes (String)
- approvedBy (ObjectId, ref: User)
- approvedAt (Date)

### Referral
- referrer (ObjectId, ref: User)
- referred (ObjectId, ref: User)
- commission (Number, default: 0)
- commissionRate (Number, default: 10)
- isActive (Boolean, default: true)

### Settings
- key (String, unique)
- value (Mixed)
- description (String)

## Default Admin Account
- Email: admin@hatrasuci.com
- Password: admin123

**IMPORTANT**: Change the admin password after first login!

## Security Features
- Password hashing with bcryptjs
- JWT token authentication
- Protected routes with middleware
- Admin-only routes
- Input validation
- Error handling middleware

## Error Handling
All errors are handled consistently with appropriate HTTP status codes:
- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (admin access required)
- 404: Not Found
- 500: Internal Server Error

## Development

### Start Development Server
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/hatra-suci |
| JWT_SECRET | Secret key for JWT | - |
| JWT_EXPIRE | JWT expiration time | 30d |
| NODE_ENV | Environment mode | development |
| ADMIN_EMAIL | Default admin email | admin@hatrasuci.com |
| ADMIN_PASSWORD | Default admin password | admin123 |

## API Response Format

### Success Response
```json
{
  "data": {},
  "message": "Success message"
}
```

### Error Response
```json
{
  "message": "Error message",
  "stack": "Stack trace (development only)"
}
```

## Testing with cURL

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Get Profile (with token)
```bash
curl -X GET http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Support
For issues or questions, please contact the development team.
