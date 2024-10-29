const { Material, Cafe } = require("../models");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
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
      cb(new Error("Only images (jpeg, jpg, png) are allowed."));
    }
  },
}).single("image");

const validateUnit = (unit) => {
  const validUnits = [
    "kilogram",
    "liter",
    "piece",
    "kuintal",
    "ons",
    "gram",
    "meter",
  ];
  return validUnits.includes(unit);
};

exports.createMaterial = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { cafeId } = req.params;
    const { name, unit } = req.body;

    if (!validateUnit(unit)) {
      return res.status(400).json({ error: "Invalid unit provided." });
    }

    const image = req.file ? req.file.path : null;

    try {
      const newMaterial = await Material.create({
        name,
        unit,
        cafeId,
        image,
      });
      res.status(201).json(newMaterial);
    } catch (error) {
      console.error("Failed to create material:", error);
      res.status(500).json({ error: "Failed to create material." });
    }
  });
};

// Get all materials for a specific cafeId
exports.getMaterials = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const materials = await Material.findAll({
      where: { cafeId },
    });
    res.status(200).json(materials);
  } catch (error) {
    console.error("Failed to retrieve materials:", error);
    res.status(500).json({ error: "Failed to retrieve materials." });
  }
};

// Get a material by ID
exports.getMaterialById = async (req, res) => {
  const { materialId } = req.params;

  try {
    const material = await Material.findByPk(materialId);
    if (material) {
      res.status(200).json(material);
    } else {
      res.status(404).json({ error: "Material not found." });
    }
  } catch (error) {
    console.error("Failed to retrieve material:", error);
    res.status(500).json({ error: "Failed to retrieve material." });
  }
};

// Update a material
exports.updateMaterial = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const { materialId } = req.params;
    const { name, unit } = req.body; // Removed stock
    const image = req.file ? req.file.path : null;

    try {
      const material = await Material.findByPk(materialId);
      if (material) {
        material.name = name;
        material.unit = unit;
        if (image) material.image = image;

        await material.save();
        res.status(200).json(material);
      } else {
        res.status(404).json({ error: "Material not found." });
      }
    } catch (error) {
      console.error("Failed to update material:", error);
      res.status(500).json({ error: "Failed to update material." });
    }
  });
};

// Delete a material
exports.deleteMaterial = async (req, res) => {
  const { materialId } = req.params;

  try {
    const material = await Material.findByPk(materialId);
    if (material) {
      await material.destroy();
      res.status(200).json({ message: "Material deleted successfully." });
    } else {
      res.status(404).json({ error: "Material not found." });
    }
  } catch (error) {
    console.error("Failed to delete material:", error);
    res.status(500).json({ error: "Failed to delete material." });
  }
};

// Get materials with their associated cafe
exports.getMaterialsWithCafe = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const cafe = await Cafe.findByPk(cafeId);
    if (!cafe) return res.status(404).json({ error: "Cafe not found." });

    const materials = await Material.findAll({
      where: { cafeId },
      include: [{ model: Cafe, attributes: ["name"] }],
    });

    res.status(200).json({ cafe, materials });
  } catch (error) {
    console.error("Failed to retrieve materials with cafe:", error);
    res.status(500).json({ error: "Failed to retrieve materials with cafe." });
  }
};
