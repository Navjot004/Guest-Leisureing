const mongoose = require('mongoose');

const guestRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  guestName: {
    type: String,
    required: [true, 'Guest name is required'],
    trim: true,
  },
  guestEmail: {
    type: String,
    required: [true, 'Guest email is required'],
    trim: true,
    lowercase: true,
  },
  guestPhone: {
    type: String,
    trim: true,
    default: '',
  },
  designation: {
    type: String,
    trim: true,
    default: '',
  },
  institution: {
    type: String,
    trim: true,
    default: '',
  },
  purposeOfVisit: {
    type: String,
    trim: true,
    default: '',
  },
  referenceCode: {
    type: String,
    unique: true,
  },

  // 0. Super Admin University Clearance Gatekeeper
  clearanceStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  },
  clearedBy: {
    type: String,
    default: '',
  },
  clearanceNotes: {
    type: String,
    default: '',
  },
  clearedAt: {
    type: Date,
    default: null,
  },

  // 1. Accommodation Requirement
  accommodation: {
    selected: { type: Boolean, default: false },
    checkInDate: { type: String, default: '' },
    checkOutDate: { type: String, default: '' },
    roomType: { type: String, default: 'Standard Room' },
    guestsCount: { type: Number, default: 1 },
    specialRequests: { type: String, default: '' },
    allocatedRoom: { type: String, default: '' },
    assignedBy: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'allocated', 'completed', 'cancelled'],
      default: 'pending',
    },
    adminNotes: { type: String, default: '' },
  },

  // 2. Food & Dining Requirement
  food: {
    selected: { type: Boolean, default: false },
    dietaryPreference: {
      type: String,
      enum: ['Vegetarian', 'Non-Vegetarian', 'Jain', 'Vegan', 'Other'],
      default: 'Vegetarian',
    },
    mealsRequired: {
      type: [String],
      default: [],
    },
    specialDietaryNotes: { type: String, default: '' },
    cateringStatus: {
      type: String,
      enum: ['pending', 'arranged', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedBy: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
  },

  // 3. Transport Requirement
  transport: {
    selected: { type: Boolean, default: false },
    pickupLocation: { type: String, default: '' },
    dropLocation: { type: String, default: '' },
    pickupDateTime: { type: String, default: '' },
    passengers: { type: Number, default: 1 },
    vehiclePreference: { type: String, default: 'Sedan' },
    allocatedVehicle: { type: String, default: '' },
    allocatedDriver: { type: String, default: '' },
    driverPhone: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'in_transit', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedBy: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
  },

  // 4. Leisure & Recreation Requirement
  leisure: {
    selected: { type: Boolean, default: false },
    activities: { type: [String], default: [] },
    preferredDates: { type: String, default: '' },
    specialRequests: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
    assignedBy: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

guestRequestSchema.pre('save', function (next) {
  if (!this.referenceCode) {
    this.referenceCode = 'CTU-VIS-' + Math.floor(10000 + Math.random() * 90000);
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('GuestRequest', guestRequestSchema);
