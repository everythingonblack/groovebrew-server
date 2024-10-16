const jwt = require('jsonwebtoken');

// Secret key for signing the JWT
const JWT_SECRET = process.env.JWT_SECRET;  // You should store this securely, e.g., in environment variables

// Generate a JWT token
function generateToken(user) {
  const payload = {
    userId: user.userId,
    username: user.username,
    roleId: user.roleId,
    cafeId: user.cafeId
  };

  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256' });
}

// Verify a JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null; // Token is invalid
  }
}

module.exports = {
  generateToken,
  verifyToken
};
