const express = require("express");
const cafeController = require("../controllers/cafeController");
const auth = require("../middlewares/auth");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");
const router = express.Router();

router.post(
  "/get-cafe-by-ownerId/:userId",
  auth([0, 1]),
  cafeController.getCafeByUserId
);
router.post("/get-cafeId/:cafeIdentifyName", cafeController.getCafeByIdentifier);
router.post("/get-cafe/:cafeId", cafeController.getCafeById);
router.post("/create-cafe", auth([1]), cafeController.createCafe);
router.put(
  "/set-cafe/:cafeId",
  auth([1,2]),
  checkCafeOwnership,
  cafeController.updateCafe
);

router.post(
  "/welcome-config/:cafeId",
  auth([1,2]),
  checkCafeOwnership,
  cafeController.updateCafeWelcomePageConfig
);
router.post(
  "/rm-cafe/:cafeId",
  auth([1]),
  checkCafeOwnership,
  cafeController.deleteCafe
);

router.put(
  "/confirmation-status/:cafeId",
  auth([1,2]),
  cafeController.setIsNeedConfirmation
); // Update an item by its ID

router.get(
  "/get-payment-methods/:cafeId",
  cafeController.getPaymentMethods
);

router.get("/check-identifyName/:cafeIdentifyName", cafeController.checkIdentifyName);

module.exports = router;
