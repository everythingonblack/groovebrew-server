const { Cafe } = require("../models");

async function checkCafeOwnership(req, res, next) {
  const { cafeId } = req.params;

  try {
    const cafe = await Cafe.findByPk(cafeId);
    if (!cafe) {
      return res.status(404).json({ error: "Cafe not found" });
    }

    if (req.user.roleId == 1) {
      if (cafe.ownerId !== req.user.userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized access to this cafe" });
      }
    }

    req.cafe = cafe;
    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { checkCafeOwnership };
