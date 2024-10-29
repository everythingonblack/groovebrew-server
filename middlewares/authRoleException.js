// middlewares/auth.js
const { User, Session } = require("../models");

const authRoleException = (exceptionRoles = []) => {
  return async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    // If no token is present, continue to next middleware or route handler
    if (!token) {
      req.user = null;
      req.session = null;
      return next();
    }

    try {
      const session = await Session.findOne({
        where: { token, isValid: true },
      });

      if (!session) {
        throw new Error("Invalid session or session has expired");
      }

      const user = await User.findByPk(session.userId);

      if (!user) {
        return res
          .status(401)
          .send({ error: "User not found. Please authenticate." });
      }

      // Check if user's role is in exceptionRoles array
      if (exceptionRoles.includes(user.roleId)) {
        return res
          .status(403)
          .send({ error: "Forbidden: Insufficient permissions" });
      }

      req.user = user;
      req.session = session;
      next();
    } catch (error) {
      res.status(401).send({ error: "Please authenticate." });
    }
  };
};

module.exports = authRoleException;
