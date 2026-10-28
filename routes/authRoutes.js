const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VerifiedStaff = require('../models/VerifiedStaff');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

const SUPER_ADMIN_ID = process.env.SUPER_ADMIN_ID || '10001';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'Master@2026';

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
        redirectUrl: '/admin-dashboard.html',
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

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: payload,
      redirectUrl: '/guest-dashboard.html',
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
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, preferences } = req.body;

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
