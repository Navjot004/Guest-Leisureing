const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const VerifiedStaff = require('../models/VerifiedStaff');
const LeisureService = require('../models/LeisureService');
const Booking = require('../models/Booking');
const GuestRequest = require('../models/GuestRequest');
const { verifySuperAdmin } = require('../middleware/auth');

// All routes in this router require Super Admin credentials
router.use(verifySuperAdmin);

// Seed data helper
const defaultServices = [
  {
    title: 'Serenity Hydrotherapy & Royal Thai Spa',
    category: 'Wellness & Spa',
    price: 240,
    duration: '90 mins',
    capacity: 2,
    description: 'Immerse in ancient thermal hydrotherapy pools followed by aromatic herbal steam and deep tissue hot stone massage crafted by master wellness therapists.',
    perks: ['Organic Herbal Tea', 'Private Steam Bath', 'Essential Oils Gift Set'],
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.95,
  },
  {
    title: 'Sunset Yacht Charter & Vintage Champagne',
    category: 'Adventure & Water',
    price: 580,
    duration: '3 hours',
    capacity: 6,
    description: 'Sail into the amber horizon on our 62-foot luxury catamaran. Includes private skipper, caviar appetizers, and Dom Pérignon vintage champagne.',
    perks: ['Private Captain & Hostess', 'Caviar & Canapés', 'Dolphin Watching'],
    image: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.98,
  },
  {
    title: 'Penthouse Michelin Star Chef Table',
    category: 'Culinary & Dining',
    price: 320,
    duration: '2.5 hours',
    capacity: 4,
    description: 'An exclusive 7-course culinary journey orchestrated live by our Michelin-starred resident executive chef with curated international wine pairings.',
    perks: ['7-Course Tasting Menu', 'Sommelier Wine Pairing', 'Panoramic Sky Views'],
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.92,
  },
  {
    title: 'Coastal Helicopter Island Excursion',
    category: 'Adventure & Water',
    price: 750,
    duration: '45 mins',
    capacity: 3,
    description: 'Soar over azure coastal lagoons, dramatic clifftops, and private coves in an air-conditioned Airbus H130 with live audio guided commentary.',
    perks: ['VIP Helipad Transfer', 'GoPro HD Flight Video', 'Complimentary Champagne Toast'],
    image: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 5.0,
  },
  {
    title: 'Private Beachside Cabana & Mixology Masterclass',
    category: 'VIP Entertainment',
    price: 195,
    duration: 'Full Day',
    capacity: 4,
    description: 'Spend an idyllic day in an oceanfront daybed with dedicated butler service, fresh tropical fruit skewers, and an interactive craft cocktail masterclass.',
    perks: ['Private Oceanfront Cabana', 'Dedicated Butler', 'Custom Cocktail Recipes'],
    image: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.88,
  },
  {
    title: 'TrackMan Golf Simulator & Coaching Suite',
    category: 'Sports & Golf',
    price: 130,
    duration: '60 mins',
    capacity: 4,
    description: 'Play over 140 championship world courses on our state-of-the-art TrackMan 4 dual-radar golf simulator with high-speed swing capture analysis.',
    perks: ['Callaway Apex Club Set', 'Swing Video Analysis', 'Artisan Craft Beer'],
    image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=800&q=80',
    available: true,
    rating: 4.86,
  },
];

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics, DB connection info, user statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const suspendedUsers = await User.countDocuments({ status: 'suspended' });
    const vipUsers = await User.countDocuments({ role: 'vip' });
    const guestUsers = await User.countDocuments({ role: 'guest' });

    const totalServices = await LeisureService.countDocuments();
    const activeServices = await LeisureService.countDocuments({ available: true });

    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    // Aggregate total revenue
    const revenueAgg = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // MongoDB connection status
    const dbState = mongoose.connection.readyState;
    const dbStates = { 0: 'Disconnected', 1: 'Connected', 2: 'Connecting', 3: 'Disconnecting' };
    const mongoInfo = {
      status: dbStates[dbState] || 'Unknown',
      readyState: dbState,
      database: mongoose.connection.name || 'guest_leisureing',
      host: mongoose.connection.host || 'navjot.4m1pws3.mongodb.net',
      uptime: process.uptime(),
    };

    // Recent registered users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('-password');

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        vipUsers,
        guestUsers,
        totalServices,
        activeServices,
        totalBookings,
        confirmedBookings,
        pendingBookings,
        totalRevenue,
      },
      mongoInfo,
      recentUsers,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/users
// @desc    Get all registered users with search and filter
router.get('/users', async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const users = await User.find(query).sort({ createdAt: -1 }).select('-password');
    return res.json({ success: true, count: users.length, users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/users
// @desc    Directly create a new user (Staff or Guest) in MongoDB
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, phone, role, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email address already exists.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const targetRole = ['staff', 'vip', 'guest'].includes(role) ? role : 'guest';
    const targetStatus = ['active', 'suspended'].includes(status) ? status : 'active';

    const newUser = new User({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: phone ? phone.trim() : '',
      role: targetRole,
      status: targetStatus,
      preferences: ['Wellness & Spa', 'Fine Dining'],
      createdAt: new Date(),
    });

    await newUser.save();

    const returnedUser = await User.findById(newUser._id).select('-password');
    return res.status(201).json({
      success: true,
      message: `Successfully created ${targetRole.toUpperCase()} user "${newUser.name}".`,
      user: returnedUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (active / suspended)
router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, message: `User status changed to ${status}`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role (guest / vip / staff / dept_admin)
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role, adminDepartment } = req.body;
    if (!['guest', 'vip', 'staff', 'dept_admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const updateFields = {
      role,
      isDeptAdmin: role === 'dept_admin',
    };
    if (adminDepartment !== undefined) {
      updateFields.adminDepartment = adminDepartment.trim();
    } else if (role !== 'dept_admin') {
      updateFields.adminDepartment = '';
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, message: `User role upgraded to ${role.toUpperCase()}`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Edit full user information (Name, Email, Phone, Role, Status, StaffId, Dept, Designation, isDeptAdmin, adminDepartment)
router.put('/users/:id', async (req, res) => {
  try {
    const { name, email, phone, role, status, staffId, department, designation, password, isDeptAdmin, adminDepartment } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (role && ['guest', 'vip', 'staff', 'dept_admin'].includes(role)) {
      user.role = role;
      user.isDeptAdmin = role === 'dept_admin';
    }
    if (isDeptAdmin !== undefined) {
      user.isDeptAdmin = !!isDeptAdmin;
      if (user.isDeptAdmin) user.role = 'dept_admin';
    }
    if (adminDepartment !== undefined) user.adminDepartment = adminDepartment.trim();
    if (status && ['active', 'suspended'].includes(status)) user.status = status;
    if (staffId !== undefined) user.staffId = staffId.trim();
    if (department !== undefined) user.department = department.trim();
    if (designation !== undefined) user.designation = designation.trim();

    // If new password is provided (min 6 chars)
    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    return res.json({
      success: true,
      message: `User profile for "${user.name}" updated successfully.`,
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Another user is already registered with this email.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// STAFF PROMOTION & DEPARTMENT ADMIN GOVERNANCE
// =========================================================================

// @route   GET /api/admin/staff
// @desc    Get all staff members and department admins with metrics & departments list
router.get('/staff', async (req, res) => {
  try {
    const { search, department, role } = req.query;
    let query = {
      role: { $in: ['staff', 'dept_admin'] },
    };

    if (role && role !== 'all') {
      query.role = role;
    }

    if (department && department !== 'all') {
      query.$or = [
        { department: { $regex: department, $options: 'i' } },
        { adminDepartment: { $regex: department, $options: 'i' } },
      ];
    }

    if (search) {
      query.$and = [
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { staffId: { $regex: search, $options: 'i' } },
            { department: { $regex: search, $options: 'i' } },
            { designation: { $regex: search, $options: 'i' } },
            { adminDepartment: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    const staffList = await User.find(query).sort({ role: -1, createdAt: -1 }).select('-password');

    // Restrict departments strictly to the 3 core hospitality departments
    const allDepartments = ['Accommodation', 'Food', 'Transport'];

    const totalStaff = await User.countDocuments({ role: { $in: ['staff', 'dept_admin'] } });
    const deptAdminsCount = await User.countDocuments({ role: 'dept_admin' });
    const regularStaffCount = totalStaff - deptAdminsCount;

    return res.json({
      success: true,
      count: staffList.length,
      staff: staffList,
      departments: allDepartments,
      stats: {
        totalStaff,
        deptAdminsCount,
        regularStaffCount,
        departmentCount: allDepartments.length,
      },
    });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/staff/:id/promote
// @desc    Promote a staff member to Department Administrator (Dept Admin)
router.put('/staff/:id/promote', async (req, res) => {
  try {
    const { adminDepartment, designation } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member record not found.' });
    }

    const targetDept = (adminDepartment || user.department || 'General Administration').trim();

    user.role = 'dept_admin';
    user.isDeptAdmin = true;
    user.adminDepartment = targetDept;
    if (designation) user.designation = designation.trim();

    await user.save();

    const returnedUser = await User.findById(user._id).select('-password');
    return res.json({
      success: true,
      message: `Staff member "${user.name}" has been officially promoted to Department Administrator for "${targetDept}".`,
      user: returnedUser,
    });
  } catch (error) {
    console.error('Error promoting staff to dept admin:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/staff/:id/demote
// @desc    Demote a Department Administrator back to standard staff
router.put('/staff/:id/demote', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Staff member record not found.' });
    }

    user.role = 'staff';
    user.isDeptAdmin = false;
    user.adminDepartment = '';

    await user.save();

    const returnedUser = await User.findById(user._id).select('-password');
    return res.json({
      success: true,
      message: `Department Administrator clearance revoked for "${user.name}". Reverted to standard staff.`,
      user: returnedUser,
    });
  } catch (error) {
    console.error('Error demoting dept admin:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user and their bookings
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Clean up bookings
    await Booking.deleteMany({ user: req.params.id });

    // Reset registration status in verified staff roster if linked
    const matchConditions = [{ registeredUserId: req.params.id }];
    if (user.email) matchConditions.push({ email: user.email.toLowerCase() });
    if (user.staffId) matchConditions.push({ staffId: user.staffId });
    await VerifiedStaff.updateMany(
      { $or: matchConditions },
      { $set: { isRegistered: false, registeredUserId: null } }
    );

    return res.json({ success: true, message: `User ${user.name} and associated records successfully deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings across the platform
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/bookings/:id/status
// @desc    Update booking status
router.put('/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid booking status' });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    return res.json({ success: true, message: `Booking status updated to ${status}`, booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/seed-services
// @desc    Seed or reset sample luxury leisure packages
router.post('/seed-services', async (req, res) => {
  try {
    const count = await LeisureService.countDocuments();
    if (count > 0 && !req.query.force) {
      const existing = await LeisureService.find();
      return res.json({ 
        success: true, 
        message: 'Leisure services already populated in MongoDB.', 
        count,
        services: existing 
      });
    }

    if (req.query.force) {
      await LeisureService.deleteMany({});
    }

    const inserted = await LeisureService.insertMany(defaultServices);
    return res.json({ 
      success: true, 
      message: `Successfully seeded ${inserted.length} luxury leisure packages!`, 
      services: inserted 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =========================================================================
// VERIFIED STAFF LIST MANAGEMENT
// =========================================================================

// @route   GET /api/admin/verified-staff
// @desc    Get verified staff roster with category, search, and status filtering
router.get('/verified-staff', async (req, res) => {
  try {
    const { category, search, status } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      if (status === 'registered') query.isRegistered = true;
      if (status === 'pending') query.isRegistered = false;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { staffId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    let totalCount = await VerifiedStaff.countDocuments();
    if (totalCount === 0) {
      const sampleStaff = [
        {
          srNo: 1,
          staffId: '24051',
          name: 'Dr. Nitin Tandon',
          department: 'Vice Chancellor, Executive Director cum Dean Research',
          designation: 'Vice Chancellor, Executive Director cum Dean Research',
          dateOfJoining: '20-01-2024',
          email: 'drnitin@ctuniversity.in',
          phone: '9847230100',
          category: 'Teaching Faculty',
          isRegistered: false,
        },
        {
          srNo: 2,
          staffId: '24088',
          name: 'Dr. Simranjeet Kaur',
          department: 'Department of Computer Science & Engineering',
          designation: 'Associate Professor & HOD',
          dateOfJoining: '12-07-2023',
          email: 'simranjeet.cse@ctuniversity.in',
          phone: '9878123450',
          category: 'Teaching Faculty',
          isRegistered: false,
        },
        {
          srNo: 1,
          staffId: '23012',
          name: 'Rajesh Kumar Sharma',
          department: 'Office of General Administration',
          designation: 'Registrar & Head of Administrative Affairs',
          dateOfJoining: '15-08-2023',
          email: 'registrar@ctuniversity.in',
          phone: '9876543210',
          category: 'Admin Faculty',
          isRegistered: false,
        },
        {
          srNo: 1,
          staffId: '22104',
          name: 'Harpreet Singh',
          department: 'Facilities & Campus Operations',
          designation: 'Estate & Campus Facility Manager',
          dateOfJoining: '10-02-2022',
          email: 'harpreet.ops@ctuniversity.in',
          phone: '9812345678',
          category: 'Non Teaching',
          isRegistered: false,
        },
      ];
      await VerifiedStaff.insertMany(sampleStaff);
      totalCount = sampleStaff.length;
    }

    const staffList = await VerifiedStaff.find(query).sort({ category: 1, srNo: 1, staffId: 1 });

    // Aggregate category summary
    const categoryStats = await VerifiedStaff.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, registered: { $sum: { $cond: ['$isRegistered', 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]);

    const registeredCount = await VerifiedStaff.countDocuments({ isRegistered: true });
    const pendingCount = totalCount - registeredCount;

    return res.json({
      success: true,
      count: staffList.length,
      staff: staffList,
      stats: {
        total: totalCount,
        registered: registeredCount,
        pending: pendingCount,
        categories: categoryStats.map((c) => ({
          name: c._id || 'Unassigned',
          count: c.count,
          registered: c.registered,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching verified staff:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to normalize category name
const normalizeStaffCategory = (cat) => {
  if (!cat) return 'Teaching Faculty';
  const c = cat.toString().toLowerCase().trim();
  if (c.includes('admin') || c.includes('non')) {
    return 'Admin & Non-Teaching';
  }
  return 'Teaching Faculty';
};

// @route   POST /api/admin/verified-staff/bulk
// @desc    Bulk upload / upsert / replace / remove verified staff members from Excel or CSV
router.post('/verified-staff/bulk', async (req, res) => {
  try {
    const { records, mode = 'append', targetCategory } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid payload: records array is required.' });
    }

    // MODE 1: REMOVE - Delete records matching the uploaded list
    if (mode === 'remove') {
      const staffIds = records
        .map((r) => (r.staffId || r.id || '').toString().trim())
        .filter(Boolean);
      const emails = records
        .map((r) => (r.email || '').toLowerCase().trim())
        .filter(Boolean);

      const conditions = [];
      if (staffIds.length > 0) conditions.push({ staffId: { $in: staffIds } });
      if (emails.length > 0) conditions.push({ email: { $in: emails } });

      let deletedCount = 0;
      if (conditions.length > 0) {
        const delResult = await VerifiedStaff.deleteMany({ $or: conditions });
        deletedCount = delResult.deletedCount;
      }

      return res.json({
        success: true,
        message: `Successfully removed ${deletedCount} matching staff records from verified roster.`,
        deletedCount,
        mode: 'remove',
        totalProcessed: records.length,
      });
    }

    // MODE 2: REPLACE - Purge existing records before inserting fresh list
    if (mode === 'replace') {
      if (targetCategory && targetCategory !== 'all') {
        const normCat = normalizeStaffCategory(targetCategory);
        await VerifiedStaff.deleteMany({ category: normCat });
      } else {
        await VerifiedStaff.deleteMany({});
      }
    }

    // Prepare batch lookup for matching registered users
    const allEmails = records.map((r) => (r.email || '').toLowerCase().trim()).filter(Boolean);
    const allStaffIds = records.map((r) => (r.staffId || r.id || '').toString().trim()).filter(Boolean);

    const userLookupConditions = [];
    if (allEmails.length > 0) userLookupConditions.push({ email: { $in: allEmails } });
    if (allStaffIds.length > 0) userLookupConditions.push({ staffId: { $in: allStaffIds } });

    let registeredUsers = [];
    if (userLookupConditions.length > 0) {
      registeredUsers = await User.find({ $or: userLookupConditions }).select('_id email staffId');
    }

    const emailUserMap = new Map();
    const staffIdUserMap = new Map();
    registeredUsers.forEach((u) => {
      if (u.email) emailUserMap.set(u.email.toLowerCase(), u._id);
      if (u.staffId) staffIdUserMap.set(u.staffId, u._id);
    });

    // MODE 2: REPLACE - High performance bulk insertion
    if (mode === 'replace') {
      const docsToInsert = [];
      for (const row of records) {
        const cleanEmail = (row.email || '').toLowerCase().trim();
        const cleanStaffId = (row.staffId || row.id || '').toString().trim();
        const cleanName = (row.name || '').trim();
        const cleanCategory = normalizeStaffCategory(row.category);

        if (!cleanEmail && !cleanStaffId && !cleanName) continue;

        const matchedUserId =
          (cleanEmail && emailUserMap.get(cleanEmail)) ||
          (cleanStaffId && staffIdUserMap.get(cleanStaffId)) ||
          null;

        docsToInsert.push({
          srNo: Number(row.srNo) || 0,
          staffId: cleanStaffId || 'PENDING',
          name: cleanName || 'Unknown Staff',
          department: (row.department || '').trim(),
          designation: (row.designation || '').trim(),
          dateOfJoining: (row.dateOfJoining || row.doj || '').trim(),
          email: cleanEmail || '',
          phone: (row.phone || row.mobile || '').toString().trim(),
          category: cleanCategory,
          isRegistered: !!matchedUserId,
          registeredUserId: matchedUserId,
        });
      }

      if (docsToInsert.length > 0) {
        await VerifiedStaff.insertMany(docsToInsert, { ordered: false });
      }

      return res.json({
        success: true,
        message: `Roster replacement complete: Verified database replaced with ${docsToInsert.length} staff records.`,
        inserted: docsToInsert.length,
        updated: 0,
        mode,
        totalProcessed: records.length,
      });
    }

    // MODE 3: APPEND / MERGE - High performance bulkWrite upserts
    const bulkOps = [];
    for (const row of records) {
      const cleanEmail = (row.email || '').toLowerCase().trim();
      const cleanStaffId = (row.staffId || row.id || '').toString().trim();
      const cleanName = (row.name || '').trim();
      const cleanCategory = normalizeStaffCategory(row.category);

      if (!cleanEmail && !cleanStaffId && !cleanName) continue;

      const matchedUserId =
        (cleanEmail && emailUserMap.get(cleanEmail)) ||
        (cleanStaffId && staffIdUserMap.get(cleanStaffId)) ||
        null;

      const matchFilter = [];
      if (cleanStaffId) matchFilter.push({ staffId: cleanStaffId });
      if (cleanEmail) matchFilter.push({ email: cleanEmail });

      bulkOps.push({
        updateOne: {
          filter: { $or: matchFilter },
          update: {
            $set: {
              srNo: Number(row.srNo) || 0,
              staffId: cleanStaffId || 'PENDING',
              name: cleanName || 'Unknown Staff',
              department: (row.department || '').trim(),
              designation: (row.designation || '').trim(),
              dateOfJoining: (row.dateOfJoining || row.doj || '').trim(),
              email: cleanEmail || '',
              phone: (row.phone || row.mobile || '').toString().trim(),
              category: cleanCategory,
              ...(matchedUserId ? { isRegistered: true, registeredUserId: matchedUserId } : {}),
            },
            $setOnInsert: {
              isRegistered: !!matchedUserId,
              registeredUserId: matchedUserId,
            },
          },
          upsert: true,
        },
      });
    }

    let upsertedCount = 0;
    let modifiedCount = 0;
    if (bulkOps.length > 0) {
      const bulkRes = await VerifiedStaff.bulkWrite(bulkOps, { ordered: false });
      upsertedCount = bulkRes.upsertedCount || 0;
      modifiedCount = bulkRes.modifiedCount || 0;
    }

    return res.json({
      success: true,
      message: `Roster upload complete: ${upsertedCount} new staff added, ${modifiedCount} existing records updated.`,
      inserted: upsertedCount,
      updated: modifiedCount,
      mode,
      totalProcessed: records.length,
    });
  } catch (error) {
    console.error('Bulk staff upload error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/verified-staff
// @desc    Add single verified staff record
router.post('/verified-staff', async (req, res) => {
  try {
    const { srNo, staffId, name, department, designation, dateOfJoining, email, phone, category } = req.body;

    if (!name || !email || !staffId) {
      return res.status(400).json({ success: false, message: 'Name, Email, and Staff ID are mandatory.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanStaffId = staffId.toString().trim();
    const cleanCategory = normalizeStaffCategory(category);

    // Duplicate check in VerifiedStaff
    const existing = await VerifiedStaff.findOne({
      $or: [{ staffId: cleanStaffId }, { email: cleanEmail }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A staff member with Staff ID "${cleanStaffId}" or Email "${cleanEmail}" is already in the verified roster.`,
      });
    }

    // Check if user is registered in MongoDB
    const matchingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { staffId: cleanStaffId }],
    });

    const totalInCat = await VerifiedStaff.countDocuments({ category: cleanCategory });

    const newStaff = new VerifiedStaff({
      srNo: Number(srNo) || (totalInCat + 1),
      staffId: cleanStaffId,
      name: name.trim(),
      department: (department || '').trim(),
      designation: (designation || '').trim(),
      dateOfJoining: (dateOfJoining || '').trim(),
      email: cleanEmail,
      phone: (phone || '').toString().trim(),
      category: cleanCategory,
      isRegistered: !!matchingUser,
      registeredUserId: matchingUser ? matchingUser._id : null,
    });

    await newStaff.save();
    return res.status(201).json({
      success: true,
      message: `Staff member "${newStaff.name}" added to verified roster successfully.`,
      staff: newStaff,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/verified-staff/:id
// @desc    Update single verified staff record
router.put('/verified-staff/:id', async (req, res) => {
  try {
    const { srNo, staffId, name, department, designation, dateOfJoining, email, phone, category } = req.body;
    const staff = await VerifiedStaff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }

    if (name) staff.name = name.trim();
    if (department !== undefined) staff.department = department.trim();
    if (designation !== undefined) staff.designation = designation.trim();
    if (dateOfJoining !== undefined) staff.dateOfJoining = dateOfJoining.trim();
    if (phone !== undefined) staff.phone = phone.toString().trim();
    if (category) staff.category = normalizeStaffCategory(category);
    if (srNo !== undefined) staff.srNo = Number(srNo) || staff.srNo;

    const newStaffId = staffId !== undefined ? staffId.toString().trim() : staff.staffId;
    const newEmail = email !== undefined ? email.toLowerCase().trim() : staff.email;

    // Check duplicate if staffId or email changed
    if (newStaffId !== staff.staffId || newEmail !== staff.email) {
      const duplicate = await VerifiedStaff.findOne({
        _id: { $ne: staff._id },
        $or: [{ staffId: newStaffId }, { email: newEmail }],
      });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another staff member with Staff ID "${newStaffId}" or Email "${newEmail}" already exists.`,
        });
      }
      staff.staffId = newStaffId;
      staff.email = newEmail;
    }

    // Refresh registration link with User
    const matchingUser = await User.findOne({
      $or: [{ email: staff.email }, { staffId: staff.staffId }],
    });
    staff.isRegistered = !!matchingUser;
    staff.registeredUserId = matchingUser ? matchingUser._id : null;

    await staff.save();
    return res.json({
      success: true,
      message: `Verified staff record for "${staff.name}" updated successfully.`,
      staff,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/verified-staff/:id
// @desc    Delete single verified staff record
router.delete('/verified-staff/:id', async (req, res) => {
  try {
    const deleted = await VerifiedStaff.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }
    return res.json({ success: true, message: `Expunged ${deleted.name} from verified staff roster.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/verified-staff
// @desc    Clear verified staff roster (optionally by category)
router.delete('/verified-staff', async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    if (category && category !== 'all') {
      filter.category = category;
    }
    const result = await VerifiedStaff.deleteMany(filter);
    return res.json({
      success: true,
      message: `Cleared ${result.deletedCount} verified staff records${category && category !== 'all' ? ` in ${category}` : ''}.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// DEPARTMENT GUEST REQUESTS GOVERNANCE
// ==========================================

// @route   GET /api/admin/departments/requests
// @desc    Retrieve real guest service requests from MongoDB (supports department filtering)
router.get('/departments/requests', async (req, res) => {
  try {
    const { department, search, status } = req.query;
    let filter = {};

    if (department === 'transport') {
      filter['transport.selected'] = true;
      if (status && status !== 'all') {
        filter['transport.status'] = status;
      }
    } else if (department === 'accommodation') {
      filter['accommodation.selected'] = true;
      if (status && status !== 'all') {
        filter['accommodation.status'] = status;
      }
    } else if (department === 'food') {
      filter['food.selected'] = true;
      if (status && status !== 'all') {
        filter['food.cateringStatus'] = status;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { guestName: { $regex: q, $options: 'i' } },
        { guestEmail: { $regex: q, $options: 'i' } },
        { guestPhone: { $regex: q, $options: 'i' } },
        { institution: { $regex: q, $options: 'i' } },
        { referenceCode: { $regex: q, $options: 'i' } },
      ];
    }

    const requests = await GuestRequest.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error fetching department requests:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/admin/departments/requests
// @desc    Create a new guest hospitality request with selections for accommodation, food, and transport
router.post('/departments/requests', async (req, res) => {
  try {
    const {
      guestName,
      guestEmail,
      guestPhone,
      designation,
      institution,
      purposeOfVisit,
      accommodation,
      food,
      transport,
    } = req.body;

    if (!guestName || !guestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Guest name and email are mandatory.',
      });
    }

    const request = new GuestRequest({
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim().toLowerCase(),
      guestPhone: (guestPhone || '').trim(),
      designation: (designation || '').trim(),
      institution: (institution || '').trim(),
      purposeOfVisit: (purposeOfVisit || '').trim(),
      accommodation: {
        selected: Boolean(accommodation?.selected),
        checkInDate: accommodation?.checkInDate || '',
        checkOutDate: accommodation?.checkOutDate || '',
        roomType: accommodation?.roomType || 'Standard Room',
        guestsCount: Number(accommodation?.guestsCount) || 1,
        specialRequests: accommodation?.specialRequests || '',
        allocatedRoom: accommodation?.allocatedRoom || '',
        status: accommodation?.status || 'pending',
      },
      food: {
        selected: Boolean(food?.selected),
        dietaryPreference: food?.dietaryPreference || 'Vegetarian',
        mealsRequired: Array.isArray(food?.mealsRequired) ? food.mealsRequired : [],
        specialDietaryNotes: food?.specialDietaryNotes || '',
        cateringStatus: food?.cateringStatus || 'pending',
      },
      transport: {
        selected: Boolean(transport?.selected),
        pickupLocation: transport?.pickupLocation || '',
        dropLocation: transport?.dropLocation || '',
        pickupDateTime: transport?.pickupDateTime || '',
        passengers: Number(transport?.passengers) || 1,
        vehiclePreference: transport?.vehiclePreference || 'Sedan',
        allocatedVehicle: transport?.allocatedVehicle || '',
        allocatedDriver: transport?.allocatedDriver || '',
        driverPhone: transport?.driverPhone || '',
        status: transport?.status || 'pending',
      },
    });

    await request.save();

    return res.status(201).json({
      success: true,
      message: `Guest request registered with reference code: ${request.referenceCode}`,
      request,
    });
  } catch (error) {
    console.error('Error saving guest request:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/admin/departments/requests/:id/assign
// @desc    Assign resources (room, driver/vehicle, or meal notes) to a guest request
router.put('/departments/requests/:id/assign', async (req, res) => {
  try {
    const { department, assignmentData } = req.body;
    const request = await GuestRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Guest request not found.' });
    }

    if (department === 'transport') {
      if (assignmentData.allocatedVehicle !== undefined) {
        request.transport.allocatedVehicle = assignmentData.allocatedVehicle;
      }
      if (assignmentData.allocatedDriver !== undefined) {
        request.transport.allocatedDriver = assignmentData.allocatedDriver;
      }
      if (assignmentData.driverPhone !== undefined) {
        request.transport.driverPhone = assignmentData.driverPhone;
      }
      if (assignmentData.status !== undefined) {
        request.transport.status = assignmentData.status;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.transport.adminNotes = assignmentData.adminNotes;
      }
      request.transport.assignedBy = req.user?.name || 'Super Admin';
    } else if (department === 'accommodation') {
      if (assignmentData.allocatedRoom !== undefined) {
        request.accommodation.allocatedRoom = assignmentData.allocatedRoom;
      }
      if (assignmentData.status !== undefined) {
        request.accommodation.status = assignmentData.status;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.accommodation.adminNotes = assignmentData.adminNotes;
      }
      request.accommodation.assignedBy = req.user?.name || 'Super Admin';
    } else if (department === 'food') {
      if (assignmentData.cateringStatus !== undefined) {
        request.food.cateringStatus = assignmentData.cateringStatus;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.food.adminNotes = assignmentData.adminNotes;
      }
      request.food.assignedBy = req.user?.name || 'Super Admin';
    } else if (department === 'leisure') {
      if (assignmentData.status !== undefined) {
        request.leisure.status = assignmentData.status;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.leisure.adminNotes = assignmentData.adminNotes;
      }
      request.leisure.assignedBy = req.user?.name || 'Super Admin';
    }

    await request.save();

    return res.json({
      success: true,
      message: `Updated ${department} assignment for ${request.guestName}.`,
      request,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/admin/departments/requests/:id
// @desc    Delete a guest request
router.delete('/departments/requests/:id', async (req, res) => {
  try {
    const deleted = await GuestRequest.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }
    return res.json({
      success: true,
      message: `Expunged guest request ${deleted.referenceCode} for ${deleted.guestName}.`,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
