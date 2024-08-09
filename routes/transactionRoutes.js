const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const transactionController = require("../controllers/transactionController");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");

// Define routes
// All of it are endpoint for each cafe
router.post(
  "/fromClerk/:cafeId",
  auth([2]),
  transactionController.transactionFromClerk
);
router.get(
  "/get-transactions/:cafeId",
  auth([2]),
  transactionController.getTransactions
);
router.post(
  "/confirm-transaction/:transactionId",
  auth([2]),
  transactionController.confirmTransaction
);
router.post(
  "/decline-transaction/:transactionId",
  auth([2]),
  transactionController.declineTransaction
);
router.post(
  "/fromGuestSide/:cafeId",
  transactionController.transactionFromGuestSide
);
router.post(
  "/fromGuestDevice/:cafeId",
  transactionController.transactionFromGuestDevice
);
module.exports = router;
