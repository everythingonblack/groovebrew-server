const bcrypt = require("bcrypt");
const { User, Session } = require("../models");
const clerkHelper = require("../services/clerkHelper");

exports.checkTokenSocket = async (socket, token) => {
  console.log("initoken" + token);
  try {
    // Here, you would typically verify the token and perform necessary operations
    // For example, you might decode the token to extract user information
    // and update some socket-related data.
    if (!token) {
      console.log("gak ketemu");
      return socket.emit("checkUserTokenRes", {
        status: 401,
        message: "No token provided. Please authenticate.",
      });
    }

    const session = await Session.findOne({
      where: { token, isValid: true },
    });
    console.log("ketemu");
    if (!session) {
      throw new Error("Invalid session or session has expired");
    }

    const user = await User.findByPk(session.userId);

    if (!user) {
      return socket.emit("checkUserTokenRes", {
        status: 404,
        message: "session not found or invalid",
      });
    }

    // Update user socket information
    clerkHelper.updateUserSocketId(user, socket.id);

    return socket.emit("checkUserTokenRes", {
      status: 200,
      message: "checking token success",
      data: { user: user, valid: true },
    });
  } catch (error) {
    console.error("Error validating token via socket:", error);
    return socket.emit("checkUserTokenRes", {
      status: 404,
      message: "session checking error",
    });
  }
};

// Controller for user login
exports.login = async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);
  try {
    const user = await User.findOne({ where: { username } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken();
    await Session.create({ userId: user.userId, token });

    res.json({ token, cafeId: user.cafeId });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller for user logout
exports.logout = async (req, res) => {
  try {
    await Session.update(
      { isValid: false },
      { where: { token: req.session.token } },
    );

    res.sendStatus(200);
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Helper function to generate a token
function generateToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
