const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const transactionController = require("../controllers/transactionController");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");

// Define routes
// All of it are endpoint for each cafe
router.post(
  "/fromClerk/:cafeId",
  auth([1,2]),
  transactionController.transactionFromClerk
);
router.get(
  "/get-transaction/:transactionId",
  auth([]),
  transactionController.getTransaction
);
router.get(
  "/check-is-my-transaction/:transactionId",
  auth([]),
  transactionController.checkIsMyTransaction
);
router.get(
  "/get-my-transactions",
  auth([]),
  transactionController.getMyTransactions
);
router.get(
  "/get-transactions/:cafeId",
  auth([]),
  transactionController.getTransactions
);

// router.get("/get-income/:cafeId", transactionController.calculateIncome);
router.post("/get-reports/:cafeId", transactionController.getReport);
router.post("/get-analytics", auth([0, 1, 2]), transactionController.getAnalytics);
// router.get("/get-favourite/:cafeId", transactionController.getBestSellingItems);
router.post(
  "/confirm-transaction/:transactionId",
  auth([1, 2]),
  transactionController.confirmTransaction
);
router.post(
  "/decline-transaction/:transactionId",
  auth([]),
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
  auth([1, 2]),
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
router.post(
  "/extentFromGuestDevice/:transactionId",
  auth([-1]),
  transactionController.extentTransaction
);

router.post(
  "/closeBillFromGuestDevice/:transactionId",
  auth([-1]),
  transactionController.closeBillFromGuestDevice
);

module.exports = router;
