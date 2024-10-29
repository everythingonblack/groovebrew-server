// middlewares/auth.js
const { User } = require("../models");
const { verifyToken } = require("../services/jwtHelper"); // Import the JWT helper


const auth = (requiredRoles = null) => {
  return async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    // if -1 it means conditional (its ok if token is null)
    if (!token && requiredRoles !== null && !requiredRoles.includes(-1)) {
      console.log("dwadwadwadwadawdawdawdwa" + token);
      return res
        .status(401)
        .send({ error: "No token provided. Please authenticate." });
    }

    try {
      let user = null;
      let decoded = null;
      console.log("dwadwadwadwadawdawdawdwa" + token + "aaa");
      if (token != "null") {
        console.log("zzzzz" + token + "aaa");
        
        decoded = verifyToken(token);

        if (!decoded) {
          throw new Error("Invalid session or session has expired");
        }

        user = await User.findByPk(decoded.userId);

        if (!user && requiredRoles !== null && !requiredRoles.includes(-1) ) {
          console.log(requiredRoles)
          return res
            .status(401)
            .send({ error: "User not found. Please authenticate." });
        }

        if (
          Array.isArray(requiredRoles) &&
          requiredRoles.length > 0 &&
          !requiredRoles.includes(-1) &&
          !requiredRoles.includes(user.roleId)
        ) {
          return res
            .status(403)
            .send({ error: "Forbidden: Insufficient permissions" });
        }
      }

      req.user = user;
      req.decoded = decoded;
      next();
    } catch (error) {
      res.status(401).send({ error: "Please authenticate." });
    }
  };
};

module.exports = auth;
