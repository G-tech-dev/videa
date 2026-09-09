const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// ==================== CONFIGURATION ====================

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/watchtoearn';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_here_change_this';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const WATCH_REWARD_RWF_PER_MINUTE = Math.max(1, Math.floor(Number(process.env.WATCH_REWARD_RWF_PER_MINUTE || 1)));
const MINIMUM_VIEW_SECONDS = 45;
const MAX_WATCH_UPDATE_SECONDS = 15;
const DAILY_REWARD_LIMIT_RWF = Math.max(1, Math.floor(Number(process.env.DAILY_REWARD_LIMIT_RWF || 5000)));

if (NODE_ENV === 'production' && JWT_SECRET === 'your_super_secret_jwt_key_here_change_this') {
  throw new Error('JWT_SECRET must be configured in production');
}
const PREMIUM_PLANS = {
  basic: {
    name: 'Basic',
    price: 2500,
    durationDays: 30,
    maxChannels: 1,
    maxVideos: 1,
    maxViews: 5000
  },
  pro: {
    name: 'Pro',
    price: 7500,
    durationDays: 30,
    maxChannels: 3,
    maxVideos: 10,
    maxViews: 25000
  },
  elite: {
    name: 'Elite',
    price: 15000,
    durationDays: 30,
    maxChannels: 10,
    maxVideos: 50,
    maxViews: 100000
  }
};

// ==================== DATABASE CONNECTION ====================

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
};

// ==================== JWT HELPER ====================

const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

// ==================== MODELS ====================

// User Model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['viewer', 'creator', 'both', 'admin'],
    default: 'viewer'
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumExpiresAt: {
    type: Date,
    default: null
  },
  premiumPlan: {
    type: String,
    enum: ['basic', 'pro', 'elite'],
    default: 'basic'
  },
  premiumViewsUsed: {
    type: Number,
    default: 0
  },
  premiumViewPeriodStart: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: 'default-avatar.png'
  },
  bio: {
    type: String,
    maxlength: 500
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalViews: {
    type: Number,
    default: 0
  },
  walletBalance: {
    type: Number,
    default: 0
  },
  dailyRewardTotal: {
    type: Number,
    default: 0
  },
  dailyRewardDate: {
    type: Date,
    default: null
  },
  walletRegisteredName: {
    type: String,
    trim: true,
    maxlength: 100
  },
  walletPhoneNumber: {
    type: String,
    trim: true,
    maxlength: 30
  },
  walletProvider: {
    type: String,
    enum: ['mtn', 'airtel', 'other'],
    default: 'mtn'
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate referral code
userSchema.pre('save', function(next) {
  if (!this.referralCode) {
    this.referralCode = this.username + Math.random().toString(36).substring(2, 7);
  }
  next();
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Channel Model
const channelSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channelName: {
    type: String,
    required: [true, 'Channel name is required'],
    trim: true,
    maxlength: [100, 'Channel name cannot exceed 100 characters']
  },
  channelDescription: {
    type: String,
    maxlength: 500
  },
  youtubeChannelId: {
    type: String,
    required: [true, 'YouTube Channel ID is required'],
    unique: true
  },
  youtubeChannelUrl: {
    type: String,
    required: [true, 'YouTube Channel URL is required']
  },
  channelLogo: {
    type: String,
    default: 'default-channel.png'
  },
  subscriberCount: {
    type: Number,
    default: 0
  },
  totalVideoCount: {
    type: Number,
    default: 0
  },
  totalViews: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  revenueShare: {
    type: Number,
    default: 65,
    min: 45,
    max: 70
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Channel = mongoose.model('Channel', channelSchema);

const fetchYouTubeStats = async (channelId) => {
  if (!YOUTUBE_API_KEY) return null;

  const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`);
  if (!response.ok) throw new Error('YouTube statistics request failed');
  const data = await response.json();
  const statistics = data.items?.[0]?.statistics;
  if (!statistics) return null;

  return {
    subscriberCount: Number(statistics.subscriberCount || 0),
    totalVideoCount: Number(statistics.videoCount || 0),
    totalViews: Number(statistics.viewCount || 0)
  };
};

// Video Model
const videoSchema = new mongoose.Schema({
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  videoTitle: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  videoDescription: {
    type: String,
    maxlength: 5000
  },
  youtubeVideoId: {
    type: String,
    required: [true, 'YouTube Video ID is required'],
    unique: true
  },
  youtubeVideoUrl: {
    type: String,
    required: [true, 'YouTube Video URL is required']
  },
  thumbnailUrl: {
    type: String
  },
  duration: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  uniqueViewers: {
    type: Number,
    default: 0
  },
  totalWatchTime: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  rewardRemainderSeconds: {
    type: Number,
    default: 0
  },
  revenuePerView: {
    type: Number,
    default: 0.001
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'paused', 'archived'],
    default: 'pending'
  },
  tags: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['gaming', 'tech', 'finance', 'education', 'entertainment', 'music', 'fitness', 'travel', 'food', 'other'],
    default: 'other'
  },
  isMonetized: {
    type: Boolean,
    default: true
  },
  engagementMetrics: {
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for faster queries
videoSchema.index({ channel: 1, createdAt: -1 });
videoSchema.index({ category: 1 });
videoSchema.index({ views: -1 });

const Video = mongoose.model('Video', videoSchema);

// Watch History Model
const watchHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  watchTime: {
    type: Number,
    default: 0
  },
  earnings: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  lastWatched: {
    type: Date,
    default: Date.now
  },
  deviceInfo: {
    type: String
  },
  ipAddress: {
    type: String
  }
}, {
  timestamps: true
});

watchHistorySchema.index({ user: 1, video: 1 }, { unique: true });
watchHistorySchema.index({ user: 1, lastWatched: -1 });
watchHistorySchema.index({ channel: 1, lastWatched: -1 });
const WatchHistory = mongoose.model('WatchHistory', watchHistorySchema);

const watchSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  startedAt: { type: Date, default: Date.now },
  lastHeartbeat: { type: Date, default: Date.now },
  creditedSeconds: { type: Number, default: 0 },
  ipAddress: String,
  deviceInfo: String,
  suspicious: { type: Boolean, default: false },
  suspiciousReasons: { type: [String], default: [] }
}, { timestamps: true });

watchSessionSchema.index({ user: 1, video: 1 }, { unique: true });
watchSessionSchema.index({ suspicious: 1, updatedAt: -1 });

const WatchSession = mongoose.model('WatchSession', watchSessionSchema);

const viewAuditSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
  watchedSeconds: { type: Number, required: true },
  reward: { type: Number, default: 0 },
  qualified: { type: Boolean, default: false },
  suspicious: { type: Boolean, default: false },
  suspiciousReasons: { type: [String], default: [] },
  deviceInfo: String,
  ipAddress: String
}, { timestamps: true });

const ViewAudit = mongoose.model('ViewAudit', viewAuditSchema);

// Wallet transaction model
const walletTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'reward', 'premium'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'rejected'],
    default: 'completed'
  },
  note: String,
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date
}, {
  timestamps: true
});

walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ type: 1, status: 1, createdAt: -1 });
const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

const adminAuditSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: String
}, { timestamps: true });

adminAuditSchema.index({ createdAt: -1 });
adminAuditSchema.index({ action: 1, createdAt: -1 });

const AdminAudit = mongoose.model('AdminAudit', adminAuditSchema);

const writeAdminAudit = (req, action, targetType, targetId, metadata = {}) => AdminAudit.create({
  actor: req.user._id,
  action,
  targetType,
  targetId,
  metadata,
  ipAddress: req.ip
});

const getAdminPagination = (query, defaultLimit = 25) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};

// Platform account that receives wallet deposits.
const platformWalletSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'primary' },
  registeredName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  provider: { type: String, default: 'mtn' }
}, { timestamps: true });

const PlatformWallet = mongoose.model('PlatformWallet', platformWalletSchema);

const seedSampleUsers = async () => {
  if (process.env.SEED_SAMPLE_USERS !== 'true') return;

  const sampleUsers = [
    {
      username: 'sampleadmin',
      email: process.env.SAMPLE_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.SAMPLE_ADMIN_PASSWORD || 'Admin123!',
      role: 'admin'
    },
    {
      username: 'sampleuser',
      email: process.env.SAMPLE_USER_EMAIL || 'user@example.com',
      password: process.env.SAMPLE_USER_PASSWORD || 'User123!',
      role: 'viewer',
      walletBalance: 25000,
      walletRegisteredName: 'Sample User',
      walletPhoneNumber: '0780000000',
      walletProvider: 'mtn'
    }
  ];

  for (const sampleUser of sampleUsers) {
    const existingUser = await User.findOne({ email: sampleUser.email });
    if (existingUser) continue;

    const user = await User.create(sampleUser);
    if (user.username === 'sampleuser') {
      await WalletTransaction.create({
        user: user._id,
        type: 'deposit',
        amount: 25000,
        status: 'completed',
        note: 'Seeded sample wallet balance'
      });
    }
    console.log(`✅ Seeded ${user.role} account: ${user.email}`);
  }
};

// ==================== MIDDLEWARE ====================

const createRateLimiter = ({ windowMs, max, message, keyFn = (req) => req.ip || req.socket.remoteAddress || 'unknown' }) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
    const entry = requests.get(key);

    if (!entry || now - entry.startedAt >= windowMs) {
      requests.set(key, { startedAt: now, count: 1 });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((windowMs - (now - entry.startedAt)) / 1000)));
      return res.status(429).json({ success: false, message });
    }

    return next();
  };
};

const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again later.'
});

const watchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 12,
  message: 'Watch updates are arriving too quickly. Please continue watching normally.',
  keyFn: (req) => `${req.ip || 'unknown'}:${req.user?._id || 'unknown'}:${req.body?.videoId || 'unknown'}`
});

const rejectAutomatedWatchers = (req, res, next) => {
  const userAgent = req.get('user-agent') || '';
  if (!userAgent || /bot|crawler|spider|headless|selenium|playwright|puppeteer|python-requests|curl/i.test(userAgent)) {
    return res.status(403).json({ success: false, message: 'Automated watch requests are not allowed.' });
  }
  next();
};

// Authentication Middleware
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Creator Only Middleware
const creatorOnly = (req, res, next) => {
  if (req.user.role !== 'creator' && req.user.role !== 'both') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Creator role required'
    });
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Administrator access required' });
  }
  next();
};

const premiumCreatorOnly = (req, res, next) => {
  const premiumActive = req.user.isPremium && (!req.user.premiumExpiresAt || req.user.premiumExpiresAt > new Date());
  if (!premiumActive) {
    return res.status(403).json({
      success: false,
      message: 'Premium creator access is required to share a channel or video'
    });
  }
  creatorOnly(req, res, next);
};

// ==================== AUTH CONTROLLERS ====================

// @desc    Register user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, role, referredBy } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username'
      });
    }

    // Create user
    let referralData = {};
    if (referredBy) {
      const referrer = await User.findOne({ referralCode: referredBy });
      if (referrer) {
        referralData.referredBy = referrer._id;
      }
    }

    const user = await User.create({
      username,
      email,
      password,
      role: ['viewer', 'creator', 'both'].includes(role) ? role : 'viewer',
      ...referralData
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        premiumPlan: user.premiumPlan,
        premiumViewsUsed: user.premiumViewsUsed,
        referralCode: user.referralCode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        premiumPlan: user.premiumPlan,
        premiumViewsUsed: user.premiumViewsUsed,
        referralCode: user.referralCode,
        totalEarnings: user.totalEarnings,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Activate premium creator access
// @route   POST /api/auth/premium
const activatePremium = async (req, res) => {
  try {
    const plan = PREMIUM_PLANS[req.body.plan] || PREMIUM_PLANS.basic;
    const user = await User.findById(req.user._id);

    if (user.isPremium && user.premiumExpiresAt > new Date()) {
      return res.status(400).json({ success: false, message: 'Premium creator access is already active' });
    }
    if (user.walletBalance < plan.price) {
      return res.status(400).json({ success: false, message: `You need RWF ${plan.price.toFixed(2)} in your wallet to activate premium` });
    }

    user.walletBalance -= plan.price;
    await WalletTransaction.create({
      user: user._id,
      type: 'premium',
      amount: plan.price,
      status: 'completed',
      note: `${plan.name} premium activation`
    });
    user.isPremium = true;
    if (user.role === 'viewer') user.role = 'both';
    user.premiumPlan = req.body.plan in PREMIUM_PLANS ? req.body.plan : 'basic';
    user.premiumViewsUsed = 0;
    user.premiumViewPeriodStart = new Date();
    user.premiumExpiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);
    await user.save();

    const publishedVideos = await Video.updateMany(
      { user: user._id, status: 'pending' },
      { $set: { status: 'active' } }
    );

    res.json({
      success: true,
      message: `${plan.name} premium activated for ${plan.durationDays} days. ${publishedVideos.modifiedCount} video${publishedVideos.modifiedCount === 1 ? '' : 's'} published.`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isPremium: user.isPremium,
        premiumExpiresAt: user.premiumExpiresAt,
        premiumPlan: user.premiumPlan,
        premiumViewsUsed: user.premiumViewsUsed,
        walletBalance: user.walletBalance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== CHANNEL CONTROLLERS ====================

// @desc    Create channel
// @route   POST /api/channels
const createChannel = async (req, res) => {
  try {
    const { channelName, channelDescription, youtubeChannelId, youtubeChannelUrl } = req.body;

    // Check if channel already exists
    const existingChannel = await Channel.findOne({ youtubeChannelId });
    if (existingChannel) {
      return res.status(400).json({
        success: false,
        message: 'Channel already registered in our system'
      });
    }

    // Check if user already has a channel
    const plan = PREMIUM_PLANS[req.user.premiumPlan] || PREMIUM_PLANS.basic;
    const channelCount = await Channel.countDocuments({ user: req.user._id });
    if (channelCount >= plan.maxChannels) {
      return res.status(400).json({
        success: false,
        message: `${plan.name} allows up to ${plan.maxChannels} channel${plan.maxChannels === 1 ? '' : 's'}`
      });
    }

    const channel = await Channel.create({
      user: req.user._id,
      channelName,
      channelDescription,
      youtubeChannelId,
      youtubeChannelUrl
    });

    // Update user role if needed
    if (req.user.role === 'viewer') {
      req.user.role = 'both';
      await req.user.save();
    }

    res.status(201).json({
      success: true,
      channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all channels
// @route   GET /api/channels
const getAllChannels = async (req, res) => {
  try {
    const channels = await Channel.find({ isActive: true })
      .populate('user', 'username email')
      .sort({ totalViews: -1 });

    res.json({
      success: true,
      count: channels.length,
      channels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get channel by ID
// @route   GET /api/channels/:id
const getChannelById = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('user', 'username email profilePicture');

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    const videos = await Video.find({ channel: channel._id, status: 'active' })
      .sort({ views: -1 })
      .limit(20);

    res.json({
      success: true,
      channel,
      videos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's channel
// @route   GET /api/channels/my-channel
const getMyChannel = async (req, res) => {
  try {
    const channel = await Channel.findOne({ user: req.user._id })
      .populate('user', 'username email');

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'You don\'t have a channel yet'
      });
    }

    try {
      const stats = await fetchYouTubeStats(channel.youtubeChannelId);
      if (stats) {
        Object.assign(channel, stats);
        await channel.save();
      }
    } catch (statsError) {
      console.error('YouTube stats sync skipped:', statsError.message);
    }

    const videos = await Video.find({ channel: channel._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      channel,
      videos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get creator analytics for the authenticated user's channel
// @route   GET /api/channels/my-channel/analytics
const getMyChannelAnalytics = async (req, res) => {
  try {
    const channel = await Channel.findOne({ user: req.user._id }).select('_id channelName');
    if (!channel) return res.status(404).json({ success: false, message: 'You don\'t have a channel yet' });

    const videos = await Video.find({ channel: channel._id })
      .select('_id videoTitle views earnings duration status createdAt')
      .sort({ views: -1 });
    const videoIds = videos.map((video) => video._id);
    const watchStats = await WatchHistory.aggregate([
      { $match: { video: { $in: videoIds } } },
      { $group: {
        _id: '$video',
        watchTime: { $sum: '$watchTime' },
        earnings: { $sum: '$earnings' },
        viewers: { $sum: 1 },
        completed: { $sum: { $cond: ['$completed', 1, 0] } }
      } }
    ]);
    const statsByVideo = new Map(watchStats.map((stat) => [stat._id.toString(), stat]));
    const videoAnalytics = videos.map((video) => {
      const stat = statsByVideo.get(video._id.toString()) || {};
      const viewers = stat.viewers || 0;
      return {
        videoId: video._id,
        title: video.videoTitle,
        status: video.status,
        views: video.views || 0,
        watchTime: stat.watchTime || 0,
        earnings: stat.earnings || 0,
        viewers,
        completed: stat.completed || 0,
        completionRate: viewers ? Math.round(((stat.completed || 0) / viewers) * 100) : 0
      };
    });

    const totals = videoAnalytics.reduce((summary, video) => ({
      views: summary.views + video.views,
      watchTime: summary.watchTime + video.watchTime,
      earnings: summary.earnings + video.earnings,
      viewers: summary.viewers + video.viewers,
      completed: summary.completed + video.completed
    }), { views: 0, watchTime: 0, earnings: 0, viewers: 0, completed: 0 });

    res.json({
      success: true,
      analytics: {
        channel,
        totals: {
          ...totals,
          completionRate: totals.viewers ? Math.round((totals.completed / totals.viewers) * 100) : 0
        },
        videos: videoAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Refresh channel statistics from YouTube
// @route   POST /api/channels/:id/refresh-stats
const refreshChannelStats = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    if (channel.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to refresh this channel' });
    }
    if (!YOUTUBE_API_KEY) {
      return res.status(503).json({ success: false, message: 'YouTube API key is not configured on the server' });
    }

    const stats = await fetchYouTubeStats(channel.youtubeChannelId);
    if (!stats) return res.status(404).json({ success: false, message: 'YouTube channel statistics were not found' });
    Object.assign(channel, stats);
    await channel.save();
    res.json({ success: true, channel });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update channel
// @route   PUT /api/channels/:id
const updateChannel = async (req, res) => {
  try {
    const { channelName, channelDescription, channelLogo } = req.body;
    
    const channel = await Channel.findById(req.params.id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: 'Channel not found'
      });
    }

    if (channel.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this channel'
      });
    }

    channel.channelName = channelName || channel.channelName;
    channel.channelDescription = channelDescription || channel.channelDescription;
    channel.channelLogo = channelLogo || channel.channelLogo;

    await channel.save();

    res.json({
      success: true,
      channel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== VIDEO CONTROLLERS ====================

// @desc    Add video
// @route   POST /api/videos
const addVideo = async (req, res) => {
  try {
    const {
      videoTitle,
      videoDescription,
      youtubeVideoId,
      youtubeVideoUrl,
      thumbnailUrl,
      duration,
      tags,
      category
    } = req.body;

    const channel = await Channel.findOne({ user: req.user._id });
    if (!channel) {
      return res.status(400).json({
        success: false,
        message: 'You need to create a channel first'
      });
    }

    const plan = PREMIUM_PLANS[req.user.premiumPlan] || PREMIUM_PLANS.basic;
    const sharedVideoCount = await Video.countDocuments({ user: req.user._id });
    if (sharedVideoCount >= plan.maxVideos) {
      return res.status(403).json({
        success: false,
        message: `${plan.name} allows up to ${plan.maxVideos} shared video${plan.maxVideos === 1 ? '' : 's'}`
      });
    }

    const existingVideo = await Video.findOne({ youtubeVideoId });
    if (existingVideo) {
      return res.status(400).json({
        success: false,
        message: 'Video already registered in our system'
      });
    }

    const video = await Video.create({
      channel: channel._id,
      user: req.user._id,
      videoTitle,
      videoDescription,
      youtubeVideoId,
      youtubeVideoUrl,
      thumbnailUrl,
      duration,
      tags: tags || [],
      category: category || 'other',
      status: 'pending'
    });

    channel.totalVideoCount += 1;
    await channel.save();

    res.status(201).json({
      success: true,
      video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all videos (with pagination)
// @route   GET /api/videos
const getAllVideos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'createdAt';

    let filter = { status: 'active' };
    if (category && category !== 'all') {
      filter.category = category;
    }

    let sort = {};
    if (sortBy === 'views') sort.views = -1;
    else if (sortBy === 'earnings') sort.earnings = -1;
    else sort.createdAt = -1;

    const videos = await Video.find(filter)
      .populate('channel', 'channelName channelLogo')
      .populate('user', 'username')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Video.countDocuments(filter);

    res.json({
      success: true,
      videos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get video by ID
// @route   GET /api/videos/:id
const getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('channel', 'channelName channelLogo subscriberCount youtubeChannelUrl')
      .populate('user', 'username');

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    const creator = await User.findById(video.user._id || video.user);
    if (creator?.isPremium && creator.premiumExpiresAt > new Date()) {
      const plan = PREMIUM_PLANS[creator.premiumPlan] || PREMIUM_PLANS.basic;
      const periodExpired = !creator.premiumViewPeriodStart || creator.premiumViewPeriodStart < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (periodExpired) creator.premiumViewsUsed = 0;
      if (creator.premiumViewsUsed >= plan.maxViews) {
        return res.status(403).json({
          success: false,
          message: `${plan.name} view limit reached. Upgrade your plan to share more views.`
        });
      }
      creator.premiumViewsUsed += 1;
      creator.premiumViewPeriodStart = creator.premiumViewPeriodStart || new Date();
      await creator.save();
    }

    res.json({
      success: true,
      video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get videos by channel
// @route   GET /api/videos/channel/:channelId
const getChannelVideos = async (req, res) => {
  try {
    const videos = await Video.find({ 
      channel: req.params.channelId,
      status: 'active'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: videos.length,
      videos
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update video
// @route   PUT /api/videos/:id
const updateVideo = async (req, res) => {
  try {
    const { videoTitle, videoDescription, tags, category, isMonetized } = req.body;

    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this video'
      });
    }

    video.videoTitle = videoTitle || video.videoTitle;
    video.videoDescription = videoDescription || video.videoDescription;
    video.tags = tags || video.tags;
    video.category = category || video.category;
    if (isMonetized !== undefined) video.isMonetized = isMonetized;

    await video.save();

    res.json({
      success: true,
      video
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete video
// @route   DELETE /api/videos/:id
const deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found'
      });
    }

    if (video.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this video'
      });
    }

    const channel = await Channel.findById(video.channel);
    if (channel) {
      channel.totalVideoCount = Math.max(0, channel.totalVideoCount - 1);
      await channel.save();
    }

    await video.remove();

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== WATCH TRACKING CONTROLLER ====================

// @desc    Track video watch time
// @route   POST /api/watch/track
const trackWatch = async (req, res) => {
  try {
    const { videoId, watchTime, completed, deviceInfo, idempotencyKey } = req.body;
    const reportedWatchSeconds = Math.max(0, Number(watchTime) || 0);
    const hasCompleted = completed === true;

    if (!mongoose.isValidObjectId(videoId) || reportedWatchSeconds <= 0) {
      return res.status(400).json({ success: false, message: 'A valid video and positive watch time are required.' });
    }

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });

    const userId = req.user._id;
    const now = new Date();
    let session = await WatchSession.findOne({ user: userId, video: videoId });
    let serverWatchedSeconds = 0;
    const suspiciousReasons = [];

    if (!session) {
      session = await WatchSession.create({
        user: userId,
        video: videoId,
        channel: video.channel,
        startedAt: now,
        lastHeartbeat: now,
        ipAddress: req.ip,
        deviceInfo: deviceInfo || req.get('user-agent')
      });
    } else {
      if (session.suspicious) suspiciousReasons.push('session_already_flagged');
      const elapsedSeconds = Math.max(0, (now.getTime() - session.lastHeartbeat.getTime()) / 1000);
      if (elapsedSeconds >= 3 && elapsedSeconds <= 30) {
        serverWatchedSeconds = Math.min(MAX_WATCH_UPDATE_SECONDS, elapsedSeconds, reportedWatchSeconds);
      } else if (elapsedSeconds < 3) {
        suspiciousReasons.push('heartbeats_arrived_too_quickly');
      } else {
        suspiciousReasons.push('heartbeat_gap_exceeded_30_seconds');
      }

      if (reportedWatchSeconds > MAX_WATCH_UPDATE_SECONDS * 4 && !hasCompleted) {
        suspiciousReasons.push('reported_watch_time_exceeded_expected_interval');
      }

      session.lastHeartbeat = now;
      session.ipAddress = req.ip;
      session.deviceInfo = deviceInfo || session.deviceInfo || req.get('user-agent');
      session.creditedSeconds += serverWatchedSeconds;
      if (suspiciousReasons.length) {
        session.suspicious = true;
        session.suspiciousReasons = [...new Set([...session.suspiciousReasons, ...suspiciousReasons])];
      }
      await session.save();
    }

    let watchHistory = await WatchHistory.findOne({ user: userId, video: videoId });
    const previousWatchTime = watchHistory?.watchTime || 0;
    const maximumWatchTime = video.duration > 0 ? video.duration : previousWatchTime + serverWatchedSeconds;
    const recordedWatchTime = Math.min(maximumWatchTime, previousWatchTime + serverWatchedSeconds);
    const newlyWatchedSeconds = Math.max(0, recordedWatchTime - previousWatchTime);
    const viewThreshold = video.duration > 0 ? Math.min(MINIMUM_VIEW_SECONDS, video.duration) : MINIMUM_VIEW_SECONDS;
    const qualifiedView = Boolean(!watchHistory?.completed && recordedWatchTime >= viewThreshold && suspiciousReasons.length === 0);

    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!user.dailyRewardDate || user.dailyRewardDate < today) {
      user.dailyRewardDate = today;
      user.dailyRewardTotal = 0;
    }

    const availableRewardSeconds = (watchHistory.rewardRemainderSeconds || 0) + newlyWatchedSeconds;
    const earnedMinutes = Math.floor(availableRewardSeconds / 60);
    const requestedEarnings = suspiciousReasons.length === 0
      ? earnedMinutes * WATCH_REWARD_RWF_PER_MINUTE
      : 0;
    const remainingDailyLimit = Math.max(0, DAILY_REWARD_LIMIT_RWF - user.dailyRewardTotal);
    let earnings = Math.min(requestedEarnings, remainingDailyLimit);
    const rewardTransactionKey = String(
      idempotencyKey || `${userId}:${videoId}:${Math.floor(recordedWatchTime)}:${requestedEarnings}`
    ).slice(0, 200);

    let rewardTransactionCreated = false;
    if (earnings > 0) {
      const existingReward = await WalletTransaction.findOne({ idempotencyKey: rewardTransactionKey });
      if (existingReward) {
        earnings = 0;
      } else {
        try {
          await WalletTransaction.create({
            user: userId,
            type: 'reward',
            amount: earnings,
            status: 'completed',
            note: `Watch reward for ${video.videoTitle}`,
            idempotencyKey: rewardTransactionKey
          });
          rewardTransactionCreated = true;
        } catch (error) {
          if (error.code === 11000) earnings = 0;
          else throw error;
        }
      }
    }

    if (!watchHistory) {
      watchHistory = new WatchHistory({ user: userId, video: videoId, channel: video.channel });
    }
    watchHistory.watchTime = recordedWatchTime;
    watchHistory.earnings += earnings;
    watchHistory.rewardRemainderSeconds = earnings < requestedEarnings
      ? 0
      : availableRewardSeconds - (earnedMinutes * 60);
    watchHistory.completed = watchHistory.completed || qualifiedView;
    watchHistory.lastWatched = now;
    watchHistory.deviceInfo = deviceInfo || watchHistory.deviceInfo || req.get('user-agent');
    watchHistory.ipAddress = req.ip;
    await watchHistory.save();

    video.totalWatchTime += newlyWatchedSeconds / 60;
    if (qualifiedView) {
      video.views += 1;
      const channel = await Channel.findById(video.channel);
      if (channel) {
        channel.totalViews += 1;
        await channel.save();
      }
    }

    const creatorEarnings = Math.floor(earnings * 0.65);
    if (rewardTransactionCreated) {
      user.walletBalance += earnings;
      user.dailyRewardTotal += earnings;
    }
    if (creatorEarnings > 0) {
      video.earnings += creatorEarnings;
      const channel = await Channel.findById(video.channel);
      if (channel) {
        channel.totalEarnings += creatorEarnings;
        await channel.save();
      }
      const creator = await User.findById(video.user);
      if (creator) {
        creator.totalEarnings += creatorEarnings;
        await creator.save();
      }
    }
    await user.save();
    await video.save();

    if (hasCompleted || qualifiedView || suspiciousReasons.length) {
      await ViewAudit.create({
        user: userId,
        video: videoId,
        watchedSeconds: recordedWatchTime,
        reward: earnings,
        qualified: qualifiedView,
        suspicious: suspiciousReasons.length > 0,
        suspiciousReasons,
        deviceInfo: deviceInfo || req.get('user-agent'),
        ipAddress: req.ip
      });
    }

    res.json({
      success: true,
      message: suspiciousReasons.length
        ? 'Watch activity was recorded for review. No reward was issued for this update.'
        : qualifiedView
          ? '45-second view counted and verified watch reward added.'
          : 'Watch time verified by the server.',
      data: {
        watchTime: newlyWatchedSeconds,
        viewerEarnings: earnings,
        creatorEarnings,
        qualifiedView,
        suspicious: suspiciousReasons.length > 0,
        dailyRewardRemaining: Math.max(0, DAILY_REWARD_LIMIT_RWF - user.dailyRewardTotal)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's watch history
// @route   GET /api/watch/history
const getWatchHistory = async (req, res) => {
  try {
    const history = await WatchHistory.find({ user: req.user._id })
      .populate('video', 'videoTitle thumbnailUrl')
      .populate('channel', 'channelName')
      .sort({ lastWatched: -1 })
      .limit(50);

    res.json({
      success: true,
      history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's earnings summary
// @route   GET /api/watch/earnings
const getEarnings = async (req, res) => {
  try {
    const history = await WatchHistory.find({ user: req.user._id });
    
    const totalEarnings = history.reduce((sum, item) => sum + item.earnings, 0);
    const totalWatchTime = history.reduce((sum, item) => sum + item.watchTime, 0);
    const completedCount = history.filter((item) => item.completed).length;

    res.json({
      success: true,
      earnings: {
        total: totalEarnings,
        watchTime: totalWatchTime,
        historyCount: history.length,
        completedCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get wallet details and recent transactions
// @route   GET /api/wallet
const getWallet = async (req, res) => {
  try {
    const platformWallet = await PlatformWallet.findOne({ key: 'primary' });
    const transactions = await WalletTransaction.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({
      success: true,
      wallet: {
        balance: req.user.walletBalance,
        registeredName: req.user.walletRegisteredName || '',
        phoneNumber: req.user.walletPhoneNumber || '',
        provider: req.user.walletProvider || 'mtn',
        depositRecipient: platformWallet ? {
          registeredName: platformWallet.registeredName,
          phoneNumber: platformWallet.phoneNumber,
          provider: platformWallet.provider
        } : null,
        transactions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save mobile money wallet details
// @route   PUT /api/wallet/details
const updateWalletDetails = async (req, res) => {
  try {
    const { registeredName, phoneNumber, provider } = req.body;
    if (!registeredName || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Registered name and phone number are required' });
    }

    const user = await User.findById(req.user._id);
    user.walletRegisteredName = registeredName.trim();
    user.walletPhoneNumber = phoneNumber.trim();
    user.walletProvider = provider || 'mtn';
    await user.save();

    res.json({
      success: true,
      wallet: {
        balance: user.walletBalance,
        registeredName: user.walletRegisteredName,
        phoneNumber: user.walletPhoneNumber,
        provider: user.walletProvider,
        transactions: await WalletTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(20)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const validateWalletAmount = (amount) => Number.isInteger(Number(amount)) && Number(amount) >= 1;

// @desc    Record a wallet deposit
// @route   POST /api/wallet/deposit
const depositToWallet = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!validateWalletAmount(amount)) {
      return res.status(400).json({ success: false, message: 'Deposit amount must be at least RWF 1' });
    }

    const platformWallet = await PlatformWallet.findOne({ key: 'primary' });
    if (!platformWallet) {
      return res.status(503).json({ success: false, message: 'Deposit recipient is not configured' });
    }

    const user = await User.findById(req.user._id);
    await WalletTransaction.create({
      user: user._id,
      type: 'deposit',
      amount,
      status: 'pending',
      note: `Pending payment to ${platformWallet.phoneNumber}`
    });

    const transactions = await WalletTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, message: 'Deposit submitted for verification', wallet: { balance: user.walletBalance, registeredName: user.walletRegisteredName || '', phoneNumber: user.walletPhoneNumber || '', provider: user.walletProvider || 'mtn', depositRecipient: { registeredName: platformWallet.registeredName, phoneNumber: platformWallet.phoneNumber, provider: platformWallet.provider }, transactions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Withdraw funds from wallet
// @route   POST /api/wallet/withdraw
const withdrawFromWallet = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!validateWalletAmount(amount)) {
      return res.status(400).json({ success: false, message: 'Withdrawal amount must be at least RWF 1' });
    }
    if (!req.user.walletRegisteredName || !req.user.walletPhoneNumber) {
      return res.status(400).json({ success: false, message: 'Save wallet details before withdrawing' });
    }

    const user = await User.findById(req.user._id);
    const pendingWithdrawals = await WalletTransaction.aggregate([
      { $match: { user: user._id, type: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const pendingAmount = pendingWithdrawals[0]?.total || 0;
    if (user.walletBalance - pendingAmount < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    await WalletTransaction.create({
      user: user._id,
      type: 'withdrawal',
      amount,
      status: 'pending',
      note: `Withdrawal to ${user.walletPhoneNumber}`
    });

    const transactions = await WalletTransaction.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, message: 'Withdrawal submitted for approval', wallet: { balance: user.walletBalance, registeredName: user.walletRegisteredName, phoneNumber: user.walletPhoneNumber, provider: user.walletProvider, transactions } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get admin dashboard data
// @route   GET /api/admin/overview
const getAdminOverview = async (req, res) => {
  try {
    const [users, pendingTransactions, completedDeposits, completedWithdrawals, suspiciousSessions, repeatedIps, repeatedDevices, platformWallet] = await Promise.all([
      User.countDocuments(),
      WalletTransaction.countDocuments({ status: 'pending' }),
      WalletTransaction.aggregate([{ $match: { type: 'deposit', status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      WalletTransaction.aggregate([{ $match: { type: 'withdrawal', status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      WatchSession.countDocuments({ suspicious: true }),
      WatchSession.aggregate([{ $match: { ipAddress: { $exists: true, $ne: null } } }, { $group: { _id: '$ipAddress', users: { $addToSet: '$user' }, sessions: { $sum: 1 } } }, { $match: { 'users.1': { $exists: true } } }, { $count: 'total' }]),
      WatchSession.aggregate([{ $match: { deviceInfo: { $exists: true, $ne: null } } }, { $group: { _id: '$deviceInfo', users: { $addToSet: '$user' }, sessions: { $sum: 1 } } }, { $match: { 'users.1': { $exists: true } } }, { $count: 'total' }]),
      PlatformWallet.findOne({ key: 'primary' })
    ]);

    res.json({
      success: true,
      overview: {
        users,
        pendingTransactions,
        completedDeposits: completedDeposits[0]?.total || 0,
        completedWithdrawals: completedWithdrawals[0]?.total || 0,
        suspiciousSessions,
        repeatedIpSignals: repeatedIps[0]?.total || 0,
        repeatedDeviceSignals: repeatedDevices[0]?.total || 0,
        platformWallet
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List wallet transactions for admin review
// @route   GET /api/admin/transactions
const getAdminTransactions = async (req, res) => {
  try {
    const { page, limit, skip } = getAdminPagination(req.query);
    const status = ['pending', 'completed', 'rejected'].includes(req.query.status) ? req.query.status : undefined;
    const query = status ? { status } : {};
    const [transactions, total] = await Promise.all([
      WalletTransaction.find(query)
        .populate('user', 'username walletProvider walletPhoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WalletTransaction.countDocuments(query)
    ]);
    res.json({ success: true, transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve or reject a wallet transaction
// @route   PATCH /api/admin/transactions/:id
const reviewAdminTransaction = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be completed or rejected' });
    }

    const transaction = await WalletTransaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
    if (transaction.status !== 'pending') return res.status(400).json({ success: false, message: 'Transaction has already been reviewed' });

    const user = await User.findById(transaction.user);
    if (!user) return res.status(404).json({ success: false, message: 'Transaction user not found' });

    if (status === 'completed') {
      if (transaction.type === 'deposit') {
        user.walletBalance += transaction.amount;
      } else {
        if (user.walletBalance < transaction.amount) {
          return res.status(400).json({ success: false, message: 'User no longer has enough balance for this withdrawal' });
        }
        user.walletBalance -= transaction.amount;
      }
      await user.save();
    }

    transaction.status = status;
    transaction.note = `${status === 'completed' ? 'Approved' : 'Rejected'} by ${req.user.username}`;
    transaction.reviewedBy = req.user._id;
    transaction.reviewedAt = new Date();
    await transaction.save();
    await writeAdminAudit(req, `transaction_${status}`, 'WalletTransaction', transaction._id, {
      transactionType: transaction.type,
      amount: transaction.amount,
      userId: transaction.user
    });
    res.json({ success: true, message: `Transaction ${status === 'completed' ? 'approved' : 'rejected'}`, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update the platform deposit recipient
// @route   PUT /api/admin/platform-wallet
const updatePlatformWallet = async (req, res) => {
  try {
    const { registeredName, phoneNumber, provider } = req.body;
    if (!registeredName?.trim() || !phoneNumber?.trim()) {
      return res.status(400).json({ success: false, message: 'Registered name and phone number are required' });
    }
    const platformWallet = await PlatformWallet.findOneAndUpdate(
      { key: 'primary' },
      { registeredName: registeredName.trim(), phoneNumber: phoneNumber.trim(), provider: provider || 'mtn' },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, platformWallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List users for admin management
// @route   GET /api/admin/users
const getAdminUsers = async (req, res) => {
  try {
    const { page, limit, skip } = getAdminPagination(req.query);
    const search = String(req.query.search || '').trim();
    const status = ['active', 'inactive'].includes(req.query.status) ? req.query.status : undefined;
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.isActive = status === 'active';
    const [users, total] = await Promise.all([User.find(query)
      .select('username role isActive createdAt isPremium premiumPlan')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit), User.countDocuments(query)]);
    res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a user's role or active state
// @route   PATCH /api/admin/users/:id
const updateAdminUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const allowedRoles = ['viewer', 'creator', 'both', 'admin'];
    if (role !== undefined && !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid user role' });
    }
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }
    if (req.params.id === req.user._id.toString() && (role !== undefined && role !== 'admin' || isActive === false)) {
      return res.status(400).json({ success: false, message: 'You cannot remove your own administrator access' });
    }

    const updates = {};
    if (role !== undefined) updates.role = role;
    if (isActive !== undefined) updates.isActive = isActive;
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await writeAdminAudit(req, 'user_updated', 'User', user._id, updates);
    res.json({ success: true, message: 'User updated', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List videos for admin moderation
// @route   GET /api/admin/videos
const getAdminVideos = async (req, res) => {
  try {
    const { page, limit, skip } = getAdminPagination(req.query);
    const status = ['pending', 'active', 'paused', 'archived'].includes(req.query.status) ? req.query.status : undefined;
    const query = status ? { status } : {};
    const [videos, total] = await Promise.all([Video.find(query)
      .populate('user', 'username')
      .populate('channel', 'channelName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit), Video.countDocuments(query)]);
    res.json({ success: true, videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change a video's moderation status
// @route   PATCH /api/admin/videos/:id
const reviewAdminVideo = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'paused', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be active, paused, or archived' });
    }
    const video = await Video.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true })
      .populate('user', 'username email')
      .populate('channel', 'channelName');
    if (!video) return res.status(404).json({ success: false, message: 'Video not found' });
    await writeAdminAudit(req, 'video_status_changed', 'Video', video._id, { status });
    res.json({ success: true, message: `Video ${status}`, video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset a video's public view counters
// @route   PATCH /api/admin/videos/:id/reset-views
const resetAdminVideoViews = async (req, res) => {
  try {
    const existingVideo = await Video.findById(req.params.id).select('views channel');
    if (!existingVideo) return res.status(404).json({ success: false, message: 'Video not found' });
    const previousViews = existingVideo.views;
    const video = await Video.findByIdAndUpdate(req.params.id, { views: 0 }, { new: true });
    const channelVideos = await Video.find({ channel: video.channel }).select('views');
    const totalViews = channelVideos.reduce((total, channelVideo) => total + channelVideo.views, 0);
    await Channel.findByIdAndUpdate(video.channel, { totalViews });
    await writeAdminAudit(req, 'video_views_reset', 'Video', video._id, { previousViews, totalViews });
    res.json({ success: true, message: 'Video views reset to 0', video });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Audit completed and rejected view attempts
// @route   GET /api/admin/view-audit
const getAdminViewAudit = async (req, res) => {
  try {
    const { page, limit, skip } = getAdminPagination(req.query);
    const [audits, total] = await Promise.all([ViewAudit.find()
      .populate('user', 'username')
      .populate('video', 'videoTitle')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit), ViewAudit.countDocuments()]);
    res.json({ success: true, audits, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getSuspiciousWatchSessions = async (req, res) => {
  try {
    const { page, limit, skip } = getAdminPagination(req.query);
    const [sessions, total] = await Promise.all([WatchSession.find({ suspicious: true })
      .populate('user', 'username role')
      .populate('video', 'videoTitle')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit), WatchSession.countDocuments({ suspicious: true })]);
    res.json({ success: true, sessions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAdminAuditLog = async (req, res) => {
  try {
    const { page, limit, skip } = getAdminPagination(req.query);
    const [entries, total] = await Promise.all([
      AdminAudit.find()
        .populate('actor', 'username role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdminAudit.countDocuments()
    ]);
    res.json({ success: true, entries, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ROUTES ====================

const app = express();

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || CORS_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => console.log(JSON.stringify({
    level: 'info',
    event: 'http_request',
    method: req.method,
    path: req.originalUrl,
    status: res.statusCode,
    durationMs: Date.now() - startedAt,
    ip: req.ip,
    userId: req.user?._id?.toString() || null
  })));
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Auth Routes
app.post('/api/auth/register', authRateLimiter, register);
app.post('/api/auth/login', authRateLimiter, login);
app.get('/api/auth/me', protect, getMe);
app.post('/api/auth/premium', protect, activatePremium);

// Channel Routes
app.post('/api/channels', protect, premiumCreatorOnly, createChannel);
app.get('/api/channels', getAllChannels);
app.get('/api/channels/my-channel', protect, getMyChannel);
app.get('/api/channels/my-channel/analytics', protect, getMyChannelAnalytics);
app.post('/api/channels/:id/refresh-stats', protect, refreshChannelStats);
app.get('/api/channels/:id', getChannelById);
app.put('/api/channels/:id', protect, updateChannel);

// Video Routes
app.post('/api/videos', protect, premiumCreatorOnly, addVideo);
app.get('/api/videos', getAllVideos);
app.get('/api/videos/channel/:channelId', getChannelVideos);
app.get('/api/videos/:id', getVideoById);
app.put('/api/videos/:id', protect, updateVideo);
app.delete('/api/videos/:id', protect, deleteVideo);

// Watch Tracking Routes
app.post('/api/watch/track', protect, watchRateLimiter, rejectAutomatedWatchers, trackWatch);
app.get('/api/watch/history', protect, getWatchHistory);
app.get('/api/watch/earnings', protect, getEarnings);

// Wallet Routes
app.get('/api/wallet', protect, getWallet);
app.put('/api/wallet/details', protect, updateWalletDetails);
app.post('/api/wallet/deposit', protect, depositToWallet);
app.post('/api/wallet/withdraw', protect, withdrawFromWallet);

// Admin Routes
app.get('/api/admin/overview', protect, adminOnly, getAdminOverview);
app.get('/api/admin/transactions', protect, adminOnly, getAdminTransactions);
app.patch('/api/admin/transactions/:id', protect, adminOnly, reviewAdminTransaction);
app.put('/api/admin/platform-wallet', protect, adminOnly, updatePlatformWallet);
app.get('/api/admin/videos', protect, adminOnly, getAdminVideos);
app.patch('/api/admin/videos/:id', protect, adminOnly, reviewAdminVideo);
app.patch('/api/admin/videos/:id/reset-views', protect, adminOnly, resetAdminVideoViews);
app.get('/api/admin/view-audit', protect, adminOnly, getAdminViewAudit);
app.get('/api/admin/watch-sessions/suspicious', protect, adminOnly, getSuspiciousWatchSessions);
app.get('/api/admin/audit-log', protect, adminOnly, getAdminAuditLog);
app.get('/api/admin/users', protect, adminOnly, getAdminUsers);
app.patch('/api/admin/users/:id', protect, adminOnly, updateAdminUser);

// Health Check
app.get('/api/health', (req, res) => {
  const memory = process.memoryUsage();
  res.json({
    success: true,
    message: 'Videa API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptimeSeconds: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: { rssMb: Math.round(memory.rss / 1024 / 1024), heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024) }
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: 'error', event: 'http_error', method: req.method, path: req.originalUrl, message: err.message, stack: NODE_ENV === 'development' ? err.stack : undefined }));
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ==================== START SERVER ====================

// Connect to database and start server
const startServer = () => connectDB().then(async () => {
  await seedSampleUsers();
  await PlatformWallet.updateOne(
    { key: 'primary' },
    { $setOnInsert: { key: 'primary', registeredName: 'Uzamukunda Seraphine', phoneNumber: '0796319967', provider: 'mtn' } },
    { upsert: true }
  );
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API Documentation available at /api/health`);
    console.log(`🔐 JWT Secret: ${JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
  });
}).catch(err => {
  console.error('❌ Failed to connect to database:', err);
  process.exit(1);
});

if (require.main === module) startServer();

module.exports = { app, startServer, connectDB, User, Channel, Video, WatchHistory, WatchSession, ViewAudit, WalletTransaction, AdminAudit };

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});