const express = require('express');
const router = express.Router();
const LeisureService = require('../models/LeisureService');
const { verifySuperAdmin } = require('../middleware/auth');

// @route   GET /api/services
// @desc    Get all active leisure services
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }

    let services = await LeisureService.find(filter).sort({ rating: -1, createdAt: -1 });

    // Auto-seed if database is brand new
    if (services.length === 0 && (!category || category === 'All')) {
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
      services = await LeisureService.insertMany(defaultServices);
    }

    return res.json({ success: true, count: services.length, services });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/services
// @desc    Super Admin creates a new leisure service
router.post('/', verifySuperAdmin, async (req, res) => {
  try {
    const { title, category, price, duration, capacity, description, perks, image } = req.body;
    if (!title || !price || !description) {
      return res.status(400).json({ success: false, message: 'Title, price, and description are required.' });
    }

    const perksArray = Array.isArray(perks) 
      ? perks 
      : (typeof perks === 'string' ? perks.split(',').map(p => p.trim()).filter(Boolean) : []);

    const newService = new LeisureService({
      title,
      category: category || 'Wellness & Spa',
      price: Number(price),
      duration: duration || '60 mins',
      capacity: Number(capacity) || 4,
      description,
      perks: perksArray,
      image: image || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
    });

    await newService.save();
    return res.status(201).json({ success: true, message: 'Leisure experience created successfully!', service: newService });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/services/:id
// @desc    Super Admin updates a leisure service
router.put('/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { title, category, price, duration, capacity, description, perks, image, available } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (category) updateData.category = category;
    if (price !== undefined) updateData.price = Number(price);
    if (duration) updateData.duration = duration;
    if (capacity !== undefined) updateData.capacity = Number(capacity);
    if (description) updateData.description = description;
    if (image) updateData.image = image;
    if (available !== undefined) updateData.available = available;
    if (perks) {
      updateData.perks = Array.isArray(perks) ? perks : perks.split(',').map(p => p.trim()).filter(Boolean);
    }

    const service = await LeisureService.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    return res.json({ success: true, message: 'Service updated successfully!', service });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/services/:id
// @desc    Super Admin deletes a service
router.delete('/:id', verifySuperAdmin, async (req, res) => {
  try {
    const service = await LeisureService.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }
    return res.json({ success: true, message: `Service "${service.title}" deleted.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
