
const express = require('express');
const cafeController = require('../controllers/cafeController');
const auth = require('../middlewares/auth');
const { checkCafeOwnership } = require('../middlewares/checkCafeOwnership');
const router = express.Router();

router.post('/get-cafe-by-ownerId/:userId', auth([0,1]), cafeController.getCafeByUserId);
router.post('/get-cafe/:cafeId', cafeController.getCafeById);
router.post('/create', auth([1]), cafeController.createCafe);
router.post('/set-cafe/:cafeId', auth([1]), checkCafeOwnership, cafeController.updateCafe);
router.post('/rm-cafe/:cafeId', auth([1]), checkCafeOwnership, cafeController.deleteCafe);

module.exports = router;