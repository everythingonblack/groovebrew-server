const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const materialController = require("../controllers/materialController");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");

// Material routes
router.post(
  "/create/:cafeId",
  auth([1]),
  checkCafeOwnership,
  materialController.createMaterial
); // Create a new material
router.get(
  "/get-materials/:cafeId",
  auth([1, 2]),
  materialController.getMaterials
); // Get all materials for a specific cafe
router.get(
  "/get-material/:materialId",
  auth([1, 2]),
  materialController.getMaterialById
); // Get a single material by its ID
router.put(
  "/update-material/:materialId",
  auth([1]),
  materialController.updateMaterial
);
router.delete(
  "/delete-material/:materialId",
  auth([1]),
  materialController.deleteMaterial
);

module.exports = router;
