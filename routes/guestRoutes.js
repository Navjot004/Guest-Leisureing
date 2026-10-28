const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const LeisureService = require('../models/LeisureService');
const { verifyToken } = require('../middleware/auth');

// All booking routes require user authentication
router.use(verifyToken);

// @route   POST /api/bookings
// @desc    Book a leisure experience
router.post('/', async (req, res) => {
  try {
    const { serviceId, bookingDate, timeSlot, guestsCount, specialRequests } = req.body;

    if (!serviceId || !bookingDate || !timeSlot) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide service, date, and preferred time slot.' 
      });
    }

    const service = await LeisureService.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Selected leisure service not found.' });
    }

    const count = Number(guestsCount) || 1;
    const totalAmount = service.price * count;
    const bookingReference = 'GL-' + Date.now().toString().slice(-6) + '-' + Math.floor(100 + Math.random() * 900);

    const booking = new Booking({
      user: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      service: service._id,
      serviceTitle: service.title,
      servicePrice: service.price,
      bookingDate,
      timeSlot,
      guestsCount: count,
      totalAmount,
      specialRequests: specialRequests || '',
      bookingReference,
      status: 'confirmed',
    });

    await booking.save();

    return res.status(201).json({
      success: true,
      message: 'Your leisure experience is successfully reserved!',
      booking,
    });
  } catch (error) {
    console.error('Booking error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/bookings/my
// @desc    Get all bookings for the logged-in guest
router.get('/my', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('service')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel a booking
router.put('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Booking is already cancelled.' });
    }

    booking.status = 'cancelled';
    await booking.save();

    return res.json({ success: true, message: 'Reservation successfully cancelled.', booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
