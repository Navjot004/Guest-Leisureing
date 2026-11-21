const mongoose = require('mongoose');

const verifiedStaffSchema = new mongoose.Schema({
  srNo: {
    type: Number,
    default: 0,
  },
  staffId: {
    type: String,
    required: [true, 'Staff ID is required'],
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Staff Name is required'],
    trim: true,
  },
  department: {
    type: String,
    default: '',
    trim: true,
  },
  designation: {
    type: String,
    default: '',
    trim: true,
  },
  dateOfJoining: {
    type: String,
    default: '',
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Staff Email is required'],
    lowercase: true,
    trim: true,
    index: true,
  },
  phone: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: String,
    default: 'Teaching Faculty',
    trim: true,
    index: true,
  },
  isRegistered: {
    type: Boolean,
    default: false,
    index: true,
  },
  registeredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for optimal lookup performance
verifiedStaffSchema.index({ staffId: 1, category: 1 });

module.exports = mongoose.model('VerifiedStaff', verifiedStaffSchema);
