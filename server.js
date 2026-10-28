require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leisureRoutes = require('./routes/leisureRoutes');
const guestRoutes = require('./routes/guestRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://princevegetasaiyan01234_db_user:navjot1234@navjot.4m1pws3.mongodb.net/guest_leisureing?retryWrites=true&w=majority';

// Middleware (Support large university roster payloads up to 50MB)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const fs = require('fs');
const clientDistPath = path.join(__dirname, 'client', 'dist');

// Serve built React TypeScript Vite app if available, else static public assets
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
} else {
  app.use(express.static(path.join(__dirname, 'public')));
}

const guestRequestRoutes = require('./routes/guestRequestRoutes');
const departmentAdminRoutes = require('./routes/departmentAdminRoutes');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dept-admin', departmentAdminRoutes);
app.use('/api/services', leisureRoutes);
app.use('/api/bookings', guestRoutes);
app.use('/api/guest-requests', guestRequestRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Guest Leisureing Platform',
    timestamp: new Date().toISOString(),
    mongoConnectionState: mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting/Disconnected',
    mongoDatabase: mongoose.connection.name || 'guest_leisureing',
  });
});

// Fallback route for SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (fs.existsSync(clientDistPath)) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});


// Database Connection and Server Boot
async function startServer() {
  try {
    console.log('Connecting to MongoDB Atlas at navjot.4m1pws3.mongodb.net...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Atlas Connected! Active DB: ${mongoose.connection.name}`);

    app.listen(PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🏨 Guest Leisureing Luxury Platform is LIVE!`);
      console.log(`🌐 Server URL:        http://localhost:${PORT}`);
      console.log(`🔑 Login Page:         http://localhost:${PORT}/login.html`);
      console.log(`📝 Register Page:      http://localhost:${PORT}/register.html`);
      console.log(`👑 Super Admin Portal: http://localhost:${PORT}/admin-dashboard.html`);
      console.log(`   Super Admin ID:     ${process.env.SUPER_ADMIN_ID || '10001'}`);
      console.log(`   Super Admin Pass:   ${process.env.SUPER_ADMIN_PASSWORD || 'Master@2026'}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  }
}

startServer();
