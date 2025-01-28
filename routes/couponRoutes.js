const express = require("express");
const couponController = require("../controllers/couponController");  // Import your coupon controller
const auth = require("../middlewares/auth");  // Assuming you have an auth middleware for role-based access
const router = express.Router();

// Route to create a coupon (Only accessible by admins)
router.post("/create", auth([0]), couponController.createCoupon);  // Only admin can create coupons

// Route to check a coupon's validity (Public route)
router.get("/check/:code", couponController.checkCoupon);  // Public route for checking coupon validity

// Route to check a coupon's validity (Public route)
router.get("/get/", auth([1]), couponController.getUserCoupons);  // Public route for checking coupon validity

// Route to create a user with a coupon code (Accessible by admins and clerks)
router.post("/create-user", couponController.createUserWithCoupon);  // Admins and clerks can create users with coupons

router.post("/log-user", auth([1, 2, 3]), couponController.logCouponToUser);

module.exports = router;
