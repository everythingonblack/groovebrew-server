const { Cafe } = require("../models");
const multer = require("multer");
const path = require("path");

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5 MB file size limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png/;
    const extname = fileTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimeType = fileTypes.test(file.mimetype);

    if (extname && mimeType) {
      return cb(null, true);
    } else {
      cb(new Error("Only images are allowed (jpeg, jpg, png)."));
    }
  },
}).single("qrBackground"); // Use 'qrBackground' for file input

// Controller methods

// Update a cafe
exports.updateCafe = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { cafeId } = req.params;
    const { name, xposition, yposition, scale } = req.body;
    const qrBackground = req.file ? req.file.path : null;

    try {
      const cafe = await Cafe.findByPk(cafeId);
      if (cafe) {
        cafe.name = name || cafe.name;
        cafe.qrBackground = qrBackground || cafe.qrBackground;
        cafe.xposition = xposition || cafe.xposition;
        cafe.yposition = yposition || cafe.yposition;
        cafe.scale = scale || cafe.scale;

        await cafe.save();
        res.status(200).json(cafe);
      } else {
        res.status(404).json({ error: "Cafe not found" });
      }
    } catch (error) {
      console.error("Error updating cafe:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};

// Example usage of other controller methods for completeness

// Create a new cafe
exports.createCafe = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Cafe name is required" });
  }

  try {
    const cafe = await Cafe.create({ name, ownerId: req.user.userId });
    res.status(201).json(cafe);
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get cafe by ID
exports.getCafeById = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const cafe = await Cafe.findByPk(cafeId);

    if (!cafe) {
      return res.status(404).json({ error: "Cafe not found" });
    }

    res.status(200).json(cafe);
  } catch (error) {
    console.error("Error fetching cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a cafe
exports.deleteCafe = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const cafe = await Cafe.findByPk(cafeId);
    if (cafe) {
      await cafe.destroy();
      res.status(200).json({ message: "Cafe deleted successfully" });
    } else {
      res.status(404).json({ error: "Cafe not found" });
    }
  } catch (error) {
    console.error("Error deleting cafe:", error);
    res.status(500).json({ error: "Internal server error" });
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
        ownerId: userId,
      },
    });
    console.log(cafes);

    res.status(200).json(cafes);
  } catch (error) {
    console.error("Error fetching cafes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
