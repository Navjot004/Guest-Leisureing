const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const GuestRequest = require('../models/GuestRequest');
const { verifyToken, JWT_SECRET } = require('../middleware/auth');

// Optional authentication helper: extracts user if token provided, but doesn't block unauthenticated guests
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (e) {
      // Token expired or invalid, continue as unauthenticated guest
      req.user = null;
    }
  }
  next();
};

// @route   POST /api/guest-requests
// @desc    Submit a new visit & facility request (Login-less by default, or attached to logged-in user)
router.post('/', optionalAuth, async (req, res) => {
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
      leisure,
    } = req.body;

    if (!guestName || !guestEmail) {
      return res.status(400).json({
        success: false,
        message: 'Guest full name and email address are required.',
      });
    }

    // Build the new request
    const newRequest = new GuestRequest({
      user: req.user ? req.user.id : undefined,
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
        allocatedRoom: '',
        status: 'pending',
      },
      food: {
        selected: Boolean(food?.selected),
        dietaryPreference: food?.dietaryPreference || 'Vegetarian',
        mealsRequired: Array.isArray(food?.mealsRequired) ? food.mealsRequired : [],
        specialDietaryNotes: food?.specialDietaryNotes || '',
        cateringStatus: 'pending',
      },
      transport: {
        selected: Boolean(transport?.selected),
        pickupLocation: transport?.pickupLocation || '',
        dropLocation: transport?.dropLocation || '',
        pickupDateTime: transport?.pickupDateTime || '',
        passengers: Number(transport?.passengers) || 1,
        vehiclePreference: transport?.vehiclePreference || 'Sedan',
        allocatedVehicle: '',
        allocatedDriver: '',
        driverPhone: '',
        status: 'pending',
      },
      leisure: {
        selected: Boolean(leisure?.selected),
        activities: Array.isArray(leisure?.activities) ? leisure.activities : [],
        preferredDates: leisure?.preferredDates || '',
        specialRequests: leisure?.specialRequests || '',
        status: 'pending',
      },
    });

    await newRequest.save();

    // Trigger asynchronous email confirmation to guest (non-blocking)
    const emailService = require('../services/emailService');
    emailService.sendApplicationReceivedEmail(newRequest).catch((err) => {
      console.error('Email dispatch warning (Application Received):', err.message);
    });

    return res.status(201).json({
      success: true,
      message: `Your visit clearance request has been successfully submitted! An email notification has been dispatched.`,
      referenceCode: newRequest.referenceCode,
      request: newRequest,
    });
  } catch (error) {
    console.error('Error submitting guest request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record your request. ' + error.message,
    });
  }
});

// @route   GET /api/guest-requests/track/:referenceCode
// @desc    Public lookup: Track a visit request by referenceCode or email (No login required)
router.get('/track/:referenceCode', async (req, res) => {
  try {
    const rawQuery = req.params.referenceCode.trim();

    if (!rawQuery) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid reference code or email.',
      });
    }

    // Try finding by referenceCode first (case-insensitive) or by email
    let request = await GuestRequest.findOne({
      referenceCode: { $regex: new RegExp(`^${rawQuery}$`, 'i') },
    });

    if (!request && rawQuery.includes('@')) {
      // Fallback: lookup the most recent request by email
      request = await GuestRequest.findOne({
        guestEmail: rawQuery.toLowerCase(),
      }).sort({ createdAt: -1 });
    }

    if (!request) {
      return res.status(404).json({
        success: false,
        message: `No visit request found for "${rawQuery}". Please check your reference code.`,
      });
    }

    return res.json({
      success: true,
      request,
    });
  } catch (error) {
    console.error('Track error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/guest-requests/my
// @desc    Get all requests submitted by the currently logged-in user
router.get('/my', verifyToken, async (req, res) => {
  try {
    const filter = {
      $or: [
        { user: req.user.id },
        { guestEmail: req.user.email.toLowerCase() },
      ],
    };

    const requests = await GuestRequest.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error('My requests error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
