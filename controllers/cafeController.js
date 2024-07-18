const { User, Cafe } = require('../models');

// For admin creating cafe
exports.createCafe = async (req, res) => {
  const { name } = req.body;

  try {
    const cafe = await Cafe.create({ name, ownerId: req.user.userId });

    res.status(201).json(cafe);
  } catch (error) {
    console.error('Error creating cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// For admin/owner updating cafe
exports.updateCafe = async (req, res) => {
  const { name } = req.body;

  try {
    const cafe = req.cafe;

    cafe.name = name;
    await cafe.save();

    res.status(200).json(cafe);
  } catch (error) {
    console.error('Error updating cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// For super admin getting cafe by user ID
exports.getCafeByUserId = async (req, res) => {
  const { userId } = req.params;
  console.log(userId + "params");
  console.log(req.user.userId + "req");
  try {
    // if (userId !== req.user.userId && req.user.roleId != 0) {
    //   return res.status(403).json({ error: 'You do not have permission to get these cafes' });
    // }

    const cafes = await Cafe.findAll({
      where: {
        ownerId: userId
      }
    });
    console.log(cafes);

    res.status(200).json(cafes);
  } catch (error) {
    console.error('Error fetching cafes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// For fetching cafe by cafe ID
exports.getCafeById = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const cafe = await Cafe.findByPk(cafeId);

    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    res.status(200).json(cafe);
  } catch (error) {
    console.error('Error fetching cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// For admin/owner deleting a cafe
exports.deleteCafe = async (req, res) => {
  try {
    const cafe = req.cafe;

    await cafe.destroy();

    res.status(200).json({ message: 'Cafe deleted successfully' });
  } catch (error) {
    console.error('Error deleting cafe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
