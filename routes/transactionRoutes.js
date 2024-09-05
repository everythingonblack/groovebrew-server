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
  "/get-transaction/:transactionId",
  auth([]),
  transactionController.getTransaction
);
router.get(
  "/get-transactions/:cafeId",
  auth([2]),
  transactionController.getTransactions
);

// router.get("/get-income/:cafeId", transactionController.calculateIncome);
router.post("/get-analytics/:cafeId", transactionController.getReport);
// router.get("/get-favourite/:cafeId", transactionController.getBestSellingItems);
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
//if buyer is claim has paid the transaction
router.post(
  "/claim-transaction/:transactionId",
  auth([]),
  transactionController.claimIsCashlessPaidTransaction
);
router.post(
  "/confirm-paid/:transactionId",
  auth([2]),
  transactionController.confirmIsCashlessPaidTransaction
);
router.post(
  "/fromGuestSide/:cafeId",
  transactionController.transactionFromGuestSide
);
router.post(
  "/fromGuestDevice/:cafeId",
  auth([-1]),
  transactionController.transactionFromGuestDevice
);
module.exports = router;
