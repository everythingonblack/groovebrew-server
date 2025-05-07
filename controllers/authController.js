const bcrypt = require("bcrypt");
const { Sequelize, User, Transaction, DetailedTransaction, Cafe } = require("../models");
const { generateToken, verifyToken } = require("../services/jwtHelper"); // Import the JWT helper
const userHelper = require("../services/userHelper");

// Controller for user login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    let cafe;

    if(user.roleId == 2) {
      cafe = await Cafe.findOne({
        where: {
          cafeId: user.cafeId,
        },
      });
    }
    // Generate JWT token
    const token = generateToken(user);

    // Respond with the token and any necessary user details
    res.json({ token, cafeId: user.cafeId, cafeIdentifyName: cafe?.dataValues.cafeIdentifyName });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.checkTokenSocket = async (socket, token, shopIdThatOwnerOpen, ownerId) => {
  try {
    if (!token) {
      return socket.emit("checkUserTokenRes", {
        status: 401,
        message: "No token provided. Please authenticate.",
      });
    }

    const userPayload = verifyToken(token);
    const user = await User.findByPk(userPayload.userId);
    if (!userPayload || !user) {
      return socket.emit("checkUserTokenRes", {
        status: 401,
        message: "Invalid or expired token.",
      });
    }

    // At this point, userPayload contains the user data decoded from the JWT
    // You can use this data to update the socket's user information
    const { userId, username, roleId, cafeId } = userPayload;
    let latestOpenBillTransaction = null;
    console.log(cafeId + "==============" + userId + ownerId)

    if (shopIdThatOwnerOpen && cafeId == null && userId != ownerId) {
      latestOpenBillTransaction = await Transaction.findOne({
        where: {
          userId: userId,
          payment_type: 'paylater',
          confirmed: 1,
          is_paid: false
        },
        include: [
          {
            model: DetailedTransaction,
          }
        ],
        order: [['createdAt', 'DESC']], // Sort by createdAt to get the latest one
      });
    }
    let cafe = null;
    if(roleId == 2) {
      cafe = await Cafe.findOne({
        where: {
          cafeId: cafeId,
        },
      });
    }
    console.log(latestOpenBillTransaction)
    // Update the user socket information if necessary (You could use a userHelper for this as before)
    userHelper.updateUserSocketId({ userId, username, roleId, cafeId }, socket.id, shopIdThatOwnerOpen);
    
    return socket.emit("checkUserTokenRes", {
      status: 200,
      message: "Token validated successfully",
      data: { user: { userId, username, roleId, cafeId, cafeIdentityName: cafe?.dataValues.cafeIdentifyName }, isTheOwner: user.userId == ownerId, latestOpenBillTransaction: latestOpenBillTransaction }
    });
  } catch (error) {
    console.error("Error validating token via socket:", error);
    return socket.emit("checkUserTokenRes", {
      status: 500,
      message: "Internal server error",
    });
  }
};