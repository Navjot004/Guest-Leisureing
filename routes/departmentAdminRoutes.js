const express = require('express');
const router = express.Router();
const GuestRequest = require('../models/GuestRequest');
const emailService = require('../services/emailService');
const { verifyDeptAdminOrSuperAdmin } = require('../middleware/auth');

// All routes here require Department Admin or Super Admin privileges
router.use(verifyDeptAdminOrSuperAdmin);

// Normalize department query param or route param
function normalizeDept(deptParam) {
  const d = (deptParam || '').toLowerCase();
  if (d === 'food' || d === 'catering' || d === 'dining') return 'catering';
  if (d === 'accommodation' || d === 'rooms' || d === 'housing') return 'accommodation';
  if (d === 'transport' || d === 'travel' || d === 'logistics') return 'transport';
  return d;
}

// Middleware to ensure Dept Admin can ONLY access their own assigned department
function ensureDepartmentScope(req, res, next) {
  const isSuperAdmin =
    (req.user.role === 'superadmin' && (req.user.id === '10001' || req.user.id === 10001)) ||
    req.user.isSuperAdmin === true;

  if (isSuperAdmin) {
    return next();
  }

  const requestedDept = normalizeDept(req.params.department);
  const rawDept = req.user.adminDepartment || req.user.department || '';
  const userDept = normalizeDept(rawDept);

  if (userDept && requestedDept !== userDept && req.user.role === 'dept_admin') {
    return res.status(403).json({
      success: false,
      message: `Access denied. You are assigned to the "${rawDept}" department desk.`,
    });
  }
  next();
}

// @route   GET /api/dept-admin/profile
// @desc    Get current department admin identity & assigned department
router.get('/profile', (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
});

// @route   GET /api/dept-admin/:department/stats
// @desc    Get real-time KPI metrics for this department (only for Super Admin approved requests)
router.get('/:department/stats', ensureDepartmentScope, async (req, res) => {
  try {
    const dept = normalizeDept(req.params.department);
    let total = 0;
    let pending = 0;
    let inProgress = 0;
    let completed = 0;

    const baseFilter = { clearanceStatus: 'approved' };

    if (dept === 'accommodation') {
      total = await GuestRequest.countDocuments({ ...baseFilter, 'accommodation.selected': true });
      pending = await GuestRequest.countDocuments({
        ...baseFilter,
        'accommodation.selected': true,
        'accommodation.status': 'pending',
      });
      inProgress = await GuestRequest.countDocuments({
        ...baseFilter,
        'accommodation.selected': true,
        'accommodation.status': 'allocated',
      });
      completed = await GuestRequest.countDocuments({
        ...baseFilter,
        'accommodation.selected': true,
        'accommodation.status': 'completed',
      });
    } else if (dept === 'catering') {
      total = await GuestRequest.countDocuments({ ...baseFilter, 'food.selected': true });
      pending = await GuestRequest.countDocuments({
        ...baseFilter,
        'food.selected': true,
        'food.cateringStatus': 'pending',
      });
      inProgress = await GuestRequest.countDocuments({
        ...baseFilter,
        'food.selected': true,
        'food.cateringStatus': 'arranged',
      });
      completed = await GuestRequest.countDocuments({
        ...baseFilter,
        'food.selected': true,
        'food.cateringStatus': 'completed',
      });
    } else if (dept === 'transport') {
      total = await GuestRequest.countDocuments({ ...baseFilter, 'transport.selected': true });
      pending = await GuestRequest.countDocuments({
        ...baseFilter,
        'transport.selected': true,
        'transport.status': 'pending',
      });
      inProgress = await GuestRequest.countDocuments({
        ...baseFilter,
        'transport.selected': true,
        'transport.status': { $in: ['assigned', 'in_transit'] },
      });
      completed = await GuestRequest.countDocuments({
        ...baseFilter,
        'transport.selected': true,
        'transport.status': 'completed',
      });
    }

    return res.json({
      success: true,
      stats: {
        department: dept,
        total,
        pending,
        inProgress,
        completed,
      },
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/dept-admin/:department/requests
// @desc    Retrieve guest visit requests relevant to this department (ONLY Super Admin approved requests)
router.get('/:department/requests', ensureDepartmentScope, async (req, res) => {
  try {
    const dept = normalizeDept(req.params.department);
    const { status, search } = req.query;

    // Strict institutional rule: Caretakers only see requests that were APPROVED by Super Admin / Dean
    let filter = {
      clearanceStatus: 'approved',
    };

    if (dept === 'accommodation') {
      filter['accommodation.selected'] = true;
      if (status && status !== 'all') {
        filter['accommodation.status'] = status;
      }
    } else if (dept === 'catering') {
      filter['food.selected'] = true;
      if (status && status !== 'all') {
        filter['food.cateringStatus'] = status;
      }
    } else if (dept === 'transport') {
      filter['transport.selected'] = true;
      if (status && status !== 'all') {
        filter['transport.status'] = status;
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { guestName: { $regex: q, $options: 'i' } },
        { guestEmail: { $regex: q, $options: 'i' } },
        { guestPhone: { $regex: q, $options: 'i' } },
        { designation: { $regex: q, $options: 'i' } },
        { institution: { $regex: q, $options: 'i' } },
        { referenceCode: { $regex: q, $options: 'i' } },
      ];
    }

    const requests = await GuestRequest.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      department: dept,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('Error fetching department requests:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/dept-admin/:department/requests/:id/assign
// @desc    Assign resources and update department-specific status
router.put('/:department/requests/:id/assign', ensureDepartmentScope, async (req, res) => {
  try {
    const dept = normalizeDept(req.params.department);
    const request = await GuestRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Guest request not found.' });
    }

    const { assignmentData } = req.body;
    if (!assignmentData) {
      return res.status(400).json({ success: false, message: 'Missing assignment data.' });
    }

    const adminName = req.user?.name || 'Department Administrator';

    if (dept === 'accommodation') {
      if (assignmentData.allocatedRoom !== undefined) {
        request.accommodation.allocatedRoom = assignmentData.allocatedRoom.trim();
      }
      if (assignmentData.status !== undefined) {
        request.accommodation.status = assignmentData.status;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.accommodation.adminNotes = assignmentData.adminNotes.trim();
      }
      request.accommodation.assignedBy = adminName;
    } else if (dept === 'catering') {
      if (assignmentData.cateringStatus !== undefined) {
        request.food.cateringStatus = assignmentData.cateringStatus;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.food.adminNotes = assignmentData.adminNotes.trim();
      }
      request.food.assignedBy = adminName;
    } else if (dept === 'transport') {
      if (assignmentData.allocatedVehicle !== undefined) {
        request.transport.allocatedVehicle = assignmentData.allocatedVehicle.trim();
      }
      if (assignmentData.allocatedDriver !== undefined) {
        request.transport.allocatedDriver = assignmentData.allocatedDriver.trim();
      }
      if (assignmentData.driverPhone !== undefined) {
        request.transport.driverPhone = assignmentData.driverPhone.trim();
      }
      if (assignmentData.status !== undefined) {
        request.transport.status = assignmentData.status;
      }
      if (assignmentData.adminNotes !== undefined) {
        request.transport.adminNotes = assignmentData.adminNotes.trim();
      }
      request.transport.assignedBy = adminName;
    }

    request.updatedAt = new Date();
    await request.save();

    // Trigger automated email update to guest regarding facility allotment
    const facilityType = dept === 'catering' ? 'food' : dept;
    const details = {
      roomNumber: request.accommodation?.allocatedRoom,
      assignedBy: adminName,
      vehicle: request.transport?.allocatedVehicle,
      driver: request.transport?.allocatedDriver,
      driverPhone: request.transport?.driverPhone,
    };
    emailService.sendFacilityUpdateEmail(request, facilityType, details).catch((err) => {
      console.error('Facility update email notification error:', err.message);
    });

    return res.json({
      success: true,
      message: `Updated ${dept} assignment for ${request.guestName}. Email notification sent.`,
      request,
    });
  } catch (error) {
    console.error('Error assigning department resources:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
