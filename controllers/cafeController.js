const { Cafe } = require("../models");
const multer = require("multer");
const path = require("path");

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const fileTypes = /jpeg|jpg|png/;
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeType = fileTypes.test(file.mimetype);

  if (extname && mimeType) {
    return cb(null, true);
  } else {
    cb(new Error("Only images are allowed (jpeg, jpg, png)."));
  }
};

// Configure multer for handling multiple file uploads
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5 MB file size limit
  fileFilter: fileFilter,
}).fields([
  { name: "qrBackground", maxCount: 1 },
  { name: "qrPayment", maxCount: 1 },
]);

// Update cafe details
exports.updateCafe = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { cafeId } = req.params;
    const { name, xposition, yposition, scale } = req.body;
    console.log(req.body);

    const qrBackground = req.files["qrBackground"]
      ? req.files["qrBackground"][0].path
      : null;
    const qrPayment = req.files["qrPayment"]
      ? req.files["qrPayment"][0].path
      : null;

    try {
      const cafe = await Cafe.findByPk(cafeId);
      if (cafe) {
        // Use existing data if new data is undefined
        cafe.name = name !== undefined ? name : cafe.name;
        cafe.qrBackground =
          qrBackground !== null ? qrBackground : cafe.qrBackground;
        cafe.qrPayment = qrPayment !== null ? qrPayment : cafe.qrPayment;
        cafe.xposition = xposition != "undefined" ? xposition : cafe.xposition;
        cafe.yposition = yposition != "undefined" ? yposition : cafe.yposition;
        cafe.scale = scale != undefined ? scale : cafe.scale;

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

exports.setIsNeedConfirmation = async (req, res) => {
  const { cafeId } = req.params;
  const { isNeedConfirmation } = req.body;

  try {
    const cafe = await Cafe.findByPk(cafeId);
    console.log(cafe);
    if (req.user.userId == cafe.ownerId) {
      console.log(isNeedConfirmation);
      cafe.needsConfirmation = isNeedConfirmation;
      await cafe.save();
      res.status(201).json(cafe);
    } else return res.status(201).json(cafe);
  } catch (error) {
    console.error("Error creating cafe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get cafes by user ID (for super admin or authorized users)
exports.getCafeByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    // Optional authorization check (commented out)
    // if (userId !== req.user.userId && req.user.roleId !== 0) {
    //   return res.status(403).json({ error: 'You do not have permission to get these cafes' });
    // }

    const cafes = await Cafe.findAll({
      where: { ownerId: userId },
    });

    res.status(200).json(cafes);
  } catch (error) {
    console.error("Error fetching cafes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
