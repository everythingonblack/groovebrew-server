const bcrypt = require('bcrypt');
const { User, Session } = require('../models');

// Endpoint to check the validity of the token
exports.checkToken = async (req, res) => {
  try {
    res.status(200).send({ user: req.user, valid: true });
  } catch (error) {
    console.error('Error validating token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller for user login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  try {
    const user = await User.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken();
    await Session.create({ userId: user.userId, token });

    res.json({ token, cafeId: user.cafeId });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Controller for user logout
exports.logout = async (req, res) => {
  try {
    await Session.update({ isValid: false }, { where: { token: req.session.token } });

    res.sendStatus(200);
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to generate a token
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
