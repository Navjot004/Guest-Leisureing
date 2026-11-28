const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VerifiedStaff = require('../models/VerifiedStaff');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const crypto = require('crypto');
const EmailOTP = require('../models/EmailOTP');
const { sendOTPEmail } = require('../services/emailService');

const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || '10001';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Master@2026';

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const OTP_MAX_ATTEMPTS = 5;
const VERIFICATION_TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

function hashVerificationValue(email, value) {
  return crypto
    .createHash('sha256')
    .update(`${email}:${value}:${JWT_SECRET}`)
    .digest('hex');
}

// @route   POST /api/auth/login
// @desc    Login either Super Admin (hardcoded 10001 / Master@2026) or registered Guest/Staff
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both your ID / Email and password.' 
      });
    }

    const cleanIdentifier = identifier.toString().trim();
    const cleanPassword = password.toString().trim();

    // 1. Check for HARDCODED SUPER ADMIN CREDENTIALS (ID: 10001, Pass: Master@2026)
    if (
      (cleanIdentifier === SUPER_ADMIN_ID || cleanIdentifier.toLowerCase() === 'superadmin@guestleisureing.com') &&
      cleanPassword === SUPER_ADMIN_PASSWORD
    ) {
      const superAdminPayload = {
        id: SUPER_ADMIN_ID,
        name: 'Super Administrator',
        email: 'superadmin@guestleisureing.com',
        role: 'superadmin',
        isSuperAdmin: true,
      };

      const token = jwt.sign(superAdminPayload, JWT_SECRET, { expiresIn: '12h' });

      return res.json({
        success: true,
        message: 'Super Admin authentication verified successfully!',
        token,
        user: superAdminPayload,
        redirectUrl: '/super-admin',
      });
    }

    // 2. Otherwise authenticate against MongoDB Users collection (by email or staffId)
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { staffId: cleanIdentifier },
      ],
    });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials. User with this Email or Staff ID does not exist.' 
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been suspended by the administrator. Please contact support.' 
      });
    }

    const isMatch = await bcrypt.compare(cleanPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password. Please check your credentials.' 
      });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    const payload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      staffId: user.staffId,
      department: user.department,
      designation: user.designation,
      isDeptAdmin: Boolean(user.isDeptAdmin || user.role === 'dept_admin'),
      adminDepartment: user.adminDepartment || user.department || '',
      preferences: user.preferences,
      mustChangePassword: Boolean(user.mustChangePassword),
      isSuperAdmin: false,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    const userRedirect =
      payload.isDeptAdmin || payload.role === 'dept_admin' || payload.role === 'staff'
        ? '/dept-admin'
        : '/guest-dashboard';

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: payload,
      redirectUrl: userRedirect,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication: ' + error.message 
    });
  }
});

// @route   POST /api/auth/register
// @route   POST /api/auth/register
// @desc    Register a new Guest user into MongoDB Atlas (Staff is provisioned by Super Admin only)


// @route POST /api/auth/send-otp
// @desc Send email verification OTP to a new guest
router.post('/send-otp', async (req, res) => {
  try {
    const email = (req.body.email || '').toString().trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
    }

    // Do not allow OTP registration for an existing account
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email is already registered.',
      });
    }

    let otpRecord = await EmailOTP.findOne({ email });

    // Resend cooldown
    if (
      otpRecord &&
      otpRecord.lastSentAt &&
      Date.now() - otpRecord.lastSentAt.getTime() <
        OTP_RESEND_COOLDOWN_MS
    ) {
      const remainingSeconds = Math.ceil(
        (OTP_RESEND_COOLDOWN_MS -
          (Date.now() - otpRecord.lastSentAt.getTime())) / 1000
      );

      return res.status(429).json({
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
      });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();

    if (!otpRecord) {
      otpRecord = new EmailOTP({ email });
    }

    otpRecord.otpHash = hashVerificationValue(email, otp);
    otpRecord.expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    otpRecord.attempts = 0;
    otpRecord.lastSentAt = new Date();
    otpRecord.verificationTokenHash = '';
    otpRecord.verificationTokenExpiresAt = null;
    otpRecord.verifiedAt = null;

    await otpRecord.save();

    try {
      await sendOTPEmail({ to: email, otp });
    } catch (mailError) {
      // Do not leave an active OTP if email delivery fails
      otpRecord.otpHash = '';
      otpRecord.expiresAt = null;
      await otpRecord.save();

      console.error('OTP email error:', mailError.message);

      return res.status(500).json({
        success: false,
        message: 'Unable to send verification email. Please try again later.',
      });
    }

    return res.json({
      success: true,
      message: 'OTP sent successfully to your email address.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while sending OTP.',
    });
  }
});

// @route POST /api/auth/verify-otp
// @desc Verify OTP and issue a temporary registration token
router.post('/verify-otp', async (req, res) => {
  try {
    const email = (req.body.email || '').toString().trim().toLowerCase();
    const otp = (req.body.otp || '').toString().trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email and 6-digit OTP.',
      });
    }

    const otpRecord = await EmailOTP.findOne({ email });

    if (!otpRecord || !otpRecord.otpHash) {
      return res.status(400).json({
        success: false,
        message: 'Please request a new OTP first.',
      });
    }

    if (!otpRecord.expiresAt || otpRecord.expiresAt.getTime() < Date.now()) {
      otpRecord.otpHash = '';
      otpRecord.expiresAt = null;
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: 'Maximum OTP attempts reached. Please request a new OTP.',
      });
    }

    otpRecord.attempts += 1;

    const submittedHash = hashVerificationValue(email, otp);

    if (submittedHash !== otpRecord.otpHash) {
      await otpRecord.save();

      return res.status(400).json({
        success: false,
        message: `Incorrect OTP. ${OTP_MAX_ATTEMPTS - otpRecord.attempts} attempts remaining.`,
      });
    }

    // OTP is correct. Generate a one-time registration token.
    const verificationToken = crypto.randomBytes(32).toString('hex');

    otpRecord.otpHash = '';
    otpRecord.expiresAt = null;
    otpRecord.verificationTokenHash = hashVerificationValue(
      email,
      verificationToken
    );
    otpRecord.verificationTokenExpiresAt = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_MS
    );
    otpRecord.verifiedAt = new Date();

    await otpRecord.save();

    return res.json({
      success: true,
      message: 'Email verified successfully.',
      verificationToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while verifying OTP.',
    });
  }
});


router.post('/register', async (req, res) => {
  try {
    const {
  name,
  email,
  password,
  phone,
  preferences,
  verificationToken,
} = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Full name, email, and password are required.' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim();

    // Prevent registering with superadmin credentials
    if (cleanEmail === 'superadmin@guestleisureing.com' || cleanEmail === SUPER_ADMIN_ID) {
      return res.status(400).json({ 
        success: false, 
        message: 'This identifier is reserved for System Administration.' 
      });
    }

    // Check if user already exists
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'An account with this email address is already registered.' 
      });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    // Require verified email before creating a guest account
if (!verificationToken) {
  return res.status(403).json({
    success: false,
    message: 'Please verify your email address before registering.',
  });
}

const tokenHash = hashVerificationValue(
  cleanEmail,
  verificationToken
);

// Atomically consume the token so it cannot be reused
const verifiedRecord = await EmailOTP.findOneAndUpdate(
  {
    email: cleanEmail,
    verificationTokenHash: tokenHash,
    verificationTokenExpiresAt: { $gt: new Date() },
    verifiedAt: { $ne: null },
  },
  {
    $set: {
      verificationTokenHash: '',
      verificationTokenExpiresAt: null,
      verifiedAt: null,
    },
  },
  { new: false }
);

if (!verifiedRecord) {
  return res.status(403).json({
    success: false,
    message: 'Email verification is invalid or expired. Please verify again.',
  });
}

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create Guest user in MongoDB
    const newUser = new User({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : '',
      role: 'guest',
      mustChangePassword: false,
      preferences: Array.isArray(preferences) && preferences.length > 0 
        ? preferences 
        : ['Wellness & Spa', 'Fine Dining'],
      lastLogin: new Date(),
    });

    await newUser.save();

    // AUTO-LINKING: Automatically bind any past visitor clearance applications submitted with this email
    try {
      const GuestRequest = require('../models/GuestRequest');
      const linkResult = await GuestRequest.updateMany(
        { guestEmail: cleanEmail, $or: [{ user: null }, { user: { $exists: false } }] },
        { $set: { user: newUser._id } }
      );
      if (linkResult.modifiedCount > 0) {
        console.log(`🔗 Auto-linked ${linkResult.modifiedCount} prior visitor application(s) to new guest account: ${cleanEmail}`);
      }
    } catch (linkErr) {
      console.error('Error auto-linking prior visitor applications on register:', linkErr);
    }

    const payload = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: 'guest',
      phone: newUser.phone,
      preferences: newUser.preferences,
      mustChangePassword: false,
      isSuperAdmin: false,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Guest profile registration successful! Any past visitor applications submitted with this email have been linked to your account.',
      token,
      user: payload,
      redirectUrl: '/guest-dashboard.html',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration: ' + error.message 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged in profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (req.user.role === 'superadmin' && req.user.id === SUPER_ADMIN_ID) {
      return res.json({
        success: true,
        user: {
          id: SUPER_ADMIN_ID,
          name: 'Super Administrator',
          email: 'superadmin@guestleisureing.com',
          role: 'superadmin',
          isSuperAdmin: true,
        },
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        staffId: user.staffId,
        department: user.department,
        designation: user.designation,
        isDeptAdmin: Boolean(user.isDeptAdmin || user.role === 'dept_admin'),
        adminDepartment: user.adminDepartment || user.department || '',
        preferences: user.preferences,
        mustChangePassword: Boolean(user.mustChangePassword),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        isSuperAdmin: false,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password (used for mandatory first-time password reset or profile update)
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
    }

    if (req.user.isSuperAdmin || req.user.id === SUPER_ADMIN_ID) {
      return res.status(400).json({ success: false, message: 'Super Administrator credentials are managed via environment configuration.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Incorrect current / temporary password.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    await user.save();

    const updatedPayload = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      staffId: user.staffId,
      department: user.department,
      designation: user.designation,
      isDeptAdmin: Boolean(user.isDeptAdmin || user.role === 'dept_admin'),
      adminDepartment: user.adminDepartment || user.department || '',
      preferences: user.preferences,
      mustChangePassword: false,
      isSuperAdmin: false,
    };

    const newToken = jwt.sign(updatedPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Password updated successfully! Welcome to your official portal desk.',
      user: updatedPayload,
      token: newToken,
    });
  } catch (error) {
    console.error('Password change error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating password: ' + error.message });
  }
});

module.exports = router;
