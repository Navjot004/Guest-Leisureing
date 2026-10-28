const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  staffId: {
    type: String,
    trim: true,
    default: '',
  },
  department: {
    type: String,
    trim: true,
    default: '',
  },
  designation: {
    type: String,
    trim: true,
    default: '',
  },
  role: {
    type: String,
    enum: ['guest', 'vip', 'staff', 'dept_admin'],
    default: 'guest',
  },
  isDeptAdmin: {
    type: Boolean,
    default: false,
  },
  adminDepartment: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active',
  },
  preferences: {
    type: [String],
    default: ['Wellness & Spa', 'Fine Dining'],
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', userSchema);
