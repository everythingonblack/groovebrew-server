// middlewares/auth.js
const { User, Session } = require('../models');

const auth = (requiredRoles = null) => {
  return async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token && requiredRoles !== null) {
      return res.status(401).send({ error: 'No token provided. Please authenticate.' });
    }

    try {
      const session = await Session.findOne({ where: { token, isValid: true } });

      if (!session) {
        throw new Error('Invalid session or session has expired');
      }

      const user = await User.findByPk(session.userId);

      if (!user) {
        return res.status(401).send({ error: 'User not found. Please authenticate.' });
      }

      if (Array.isArray(requiredRoles) && requiredRoles.length > 0 && !requiredRoles.includes(user.roleId)) {
        return res.status(403).send({ error: 'Forbidden: Insufficient permissions' });
      }

      req.user = user;
      req.session = session;
      next();
    } catch (error) {
      res.status(401).send({ error: 'Please authenticate.' });
    }
  };
};

module.exports = auth;
