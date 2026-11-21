require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const leisureRoutes = require('./routes/leisureRoutes');
const guestRoutes = require('./routes/guestRoutes');
const guestRequestRoutes = require('./routes/guestRequestRoutes');
const departmentAdminRoutes = require('./routes/departmentAdminRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ FATAL: MONGODB_URI is not set in environment or .env file.');
  process.exit(1);
}

// 1. Security Headers via Helmet (configured to allow Vite frontend scripts/styles)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// 2. CORS & Body Parsers
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// 3. Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api/', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login/register attempts. Please wait 15 minutes before trying again.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 4. Client Static Assets (Built React SPA)
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// 5. API Routes
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

// Fallback route for SPA client routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  if (fs.existsSync(clientDistPath)) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Guest Leisureing • Starting up</title></head>
        <body style="font-family: sans-serif; display: grid; place-items: center; min-height: 80vh; background: #0f172a; color: #f8fafc;">
          <div style="text-align: center; max-width: 500px; padding: 2rem; border: 1px solid #334155; border-radius: 12px; background: #1e293b;">
            <h2>Development Mode Active</h2>
            <p style="color: #94a3b8;">Frontend is running on Vite Dev Server: <a href="http://localhost:5173" style="color: #38bdf8;">http://localhost:5173</a></p>
            <p style="font-size: 0.85rem; color: #64748b;">To build production assets, run: <code>cd client & npm run build</code></p>
          </div>
        </body>
      </html>
    `);
  }
});

// Database Connection and Server Boot
async function startServer() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Atlas Connected! Active DB: ${mongoose.connection.name}`);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`🏨 Guest Leisureing Backend API is LIVE!`);
      console.log(`🌐 Backend API URL:    http://localhost:${PORT}`);
      console.log(`💻 Frontend Dev URL:   http://localhost:5173`);
      console.log(`👑 Super Admin Access: http://localhost:5173/login`);
      console.log(`   Super Admin ID:     ${process.env.SUPER_ADMIN_ID || '10001'}`);
      console.log(`   Super Admin Pass:   ${process.env.SUPER_ADMIN_PASSWORD || 'Master@2026'}`);
      console.log(`======================================================\n`);
    });
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB Atlas:', err.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

startServer();
