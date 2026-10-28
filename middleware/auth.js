const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_guest_leisureing_jwt_key_2026_luxury_secure';

// Middleware to verify any authenticated token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
}

// Middleware to ensure requester is Super Admin (Hardcoded ID 10001)
function verifySuperAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user && req.user.role === 'superadmin' && req.user.id === '10001') {
      next();
    } else {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden. Super Admin privileges required.' 
      });
    }
  });
}

// Middleware to ensure requester is Department Admin or Super Admin
function verifyDeptAdminOrSuperAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }
    const isSuperAdmin =
      (req.user.role === 'superadmin' && (req.user.id === '10001' || req.user.id === '10001')) ||
      req.user.isSuperAdmin === true;
    const isDeptAdmin =
      req.user.role === 'dept_admin' ||
      req.user.isDeptAdmin === true ||
      req.user.role === 'staff';

    if (isSuperAdmin || isDeptAdmin) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Department Administrator, Staff, or Super Admin privileges required.',
      });
    }
  });
}

module.exports = {
  verifyToken,
  verifySuperAdmin,
  verifyDeptAdminOrSuperAdmin,
  JWT_SECRET,
};
