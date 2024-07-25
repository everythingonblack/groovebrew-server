const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const auth = require("../middlewares/auth");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");
const router = express.Router();
const { io } = require("../index");

// Auth routes
//checking token is from socket
io.on("connection", (socket) => {
  console.log("A user connected");

  // Example event to handle token check
  socket.on("checkUserToken", (token) => {
    authController.checkTokenSocket(socket, token);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    // Handle disconnect logic if needed
  });
});

router.post("/login", authController.login);
router.post("/logout", auth([]), authController.logout);
router.post("/create-guest", userController.createGuest);

// User routes
router.post("/update-user", auth([]), userController.updateUser);
router.post("/create-admin", auth([0]), userController.createAdmin);
router.post("/get-admin", auth([0]), userController.getAdminList);

// Clerk routes
router.post("/create-clerk", auth([1]), userController.createClerk);
router.get(
  "/get-clerk/:cafeId",
  auth([1]),
  checkCafeOwnership,
  userController.getClerkByCafeId,
);

module.exports = router;
