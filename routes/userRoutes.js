const express = require("express");
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");
const auth = require("../middlewares/auth");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");
const router = express.Router();

// Auth routes
//checking token is through socket, in index.js

router.post("/login", authController.login);
router.post("/logout", auth([]), authController.logout);
router.post("/create-guest", userController.createGuest);

// User routes
router.post("/update-user", auth([]), userController.updateUser);
router.post("/create-admin", auth([0]), userController.createAdmin);
router.post("/get-admin", auth([0]), userController.getAdminList);

// Clerk routes
router.post(
  "/create-clerk",
  auth([1]),
  checkCafeOwnership,
  userController.createClerk,
);
router.get(
  "/get-clerk/:cafeId",
  auth([1]),
  checkCafeOwnership,
  userController.getClerkByCafeId,
);

module.exports = router;
