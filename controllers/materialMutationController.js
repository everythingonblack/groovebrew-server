const { Material, MaterialMutation } = require("../models");

// Create a new material mutation
exports.createMaterialMutation = async (req, res) => {
  const { materialId } = req.params;
  const { oldStock, newStock, changeDate, reason } = req.body;

  try {
    const newMutation = await MaterialMutation.create({
      materialId,
      oldStock,
      newStock,
      changeDate,
      reason,
    });
    res.status(201).json(newMutation);
  } catch (error) {
    console.error("Failed to create material mutation:", error);
    res.status(500).json({ error: "Failed to create material mutation." });
  }
};

// Get all material mutations for a specific cafe
exports.getMaterialMutations = async (req, res) => {
  const { cafeId } = req.params;

  try {
    // Assuming Material has a relation to MaterialMutation
    const mutations = await MaterialMutation.findAll({
      include: [{ model: Material, where: { cafeId }, attributes: ["name"] }],
    });
    res.status(200).json(mutations);
  } catch (error) {
    console.error("Failed to retrieve material mutations:", error);
    res.status(500).json({ error: "Failed to retrieve material mutations." });
  }
};

// Get a single material mutation by ID
exports.getMaterialMutationById = async (req, res) => {
  const { mutationId } = req.params;

  try {
    const mutation = await MaterialMutation.findByPk(mutationId);
    if (mutation) {
      res.status(200).json(mutation);
    } else {
      res.status(404).json({ error: "Material mutation not found." });
    }
  } catch (error) {
    console.error("Failed to retrieve material mutation:", error);
    res.status(500).json({ error: "Failed to retrieve material mutation." });
  }
};
