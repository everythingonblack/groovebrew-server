const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const itemController = require("../controllers/itemController");
const { checkCafeOwnership } = require("../middlewares/checkCafeOwnership");

// Item routes
router.post(
  "/create/:cafeId",
  auth([1, 2]),
  checkCafeOwnership,
  itemController.createItem
); // Create a new item
router.get("/get-items/:cafeId", itemController.getItems); // Get all items for a specific cafe
router.get("/get-item/:itemId", itemController.getItemById); // Get a single item by its ID
router.put("/set-item/:itemId", auth([1, 2]), itemController.updateItem); // Update an item by its ID
router.delete(
  "/rm-item/:itemId",
  auth([1]),
  checkCafeOwnership,
  itemController.deleteItem
); // Delete an item by its ID
router.put(
  "/set-availability/:itemId",
  auth([1, 2]),
  itemController.setAvailability
); // Update an item by its ID

// Item type routes
router.get("/getItemType/:cafeId", itemController.getItemType); // Get all item types for a specific cafe
router.post(
  "/createType/:cafeId",
  auth([1, 2]),
  checkCafeOwnership,
  itemController.createItemType
); // Create a new item type for a cafe
router.put(
  "/updateType/:cafeId/:itemTypeId",
  auth([1, 2]),
  checkCafeOwnership,
  itemController.updateItemType
); // Update an item type by its ID
router.delete(
  "/deleteType/:cafeId/:itemTypeId",
  auth([1]),
  checkCafeOwnership,
  itemController.deleteItemType
); // Delete an item type by its ID

// Combined item and type routes
router.get(
  "/get-cafe-items/:cafeIdentifyName",
  auth([-1]),
  itemController.getItemTypesWithItems
); // Get all item types with their associated items for a specific cafe
router.post("/get-cart-details/:cafeId", itemController.getCartDetails); // Get cart details for a specific cafe

router.put('/moveType/:itemTypeId/:targetItemTypeId/:fromOrder/:toOrder', auth([1, 2]), itemController.moveItemType);


module.exports = router;
