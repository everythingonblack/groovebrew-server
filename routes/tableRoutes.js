const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const tableController = require('../controllers/tableController');
const { checkCafeOwnership } = require('../middlewares/checkCafeOwnership');

// Define routes
// All of it are endpoint for each cafe
router.post('/create/:cafeId', auth([1]), checkCafeOwnership, tableController.createTable);
router.get('/get-table/:cafeId', tableController.getTable);
router.get('/get-tables/:cafeId', tableController.getTables);
router.put('/set-table/:cafeId/:tableId', auth([1]), checkCafeOwnership, tableController.updateTable);
router.delete('/rm-table/:cafeId/:tableId', auth([1]), checkCafeOwnership, tableController.deleteTable);

module.exports = router;
