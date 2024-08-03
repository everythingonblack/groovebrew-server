const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const materialMutationController = require("../controllers/materialMutationController");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");

// Material Mutation routes
router.post(
  "/create/:materialId",
  auth([1]), // Adjust permissions as needed
  materialMutationController.createMaterialMutation
); // Create a new material mutation

router.get(
  "/get-material-mutations/:cafeId",
  auth([1, 2]),
  materialMutationController.getMaterialMutations
); // Get all material mutations for a specific cafe

router.get(
  "/get-material-mutation/:mutationId",
  auth([1, 2]),
  materialMutationController.getMaterialMutationById
); // Get a single material mutation by its ID

module.exports = router;
