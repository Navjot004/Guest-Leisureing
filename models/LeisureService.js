 const mongoose = require('mongoose');

const leisureServiceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['Wellness & Spa', 'Culinary & Dining', 'Adventure & Water', 'VIP Entertainment', 'Sports & Golf'],
    default: 'Wellness & Spa',
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
  },
  duration: {
    type: String,
    default: '60 mins',
  },
  capacity: {
    type: Number,
    default: 4,
  },
  description: {
    type: String,
    required: true,
  },
  perks: {
    type: [String],
    default: [],
  },
  image: {
    type: String,
    default: '',
  },
  available: {
    type: Boolean,
    default: true,
  },
  rating: {
    type: Number,
    default: 4.9,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('LeisureService', leisureServiceSchema);
