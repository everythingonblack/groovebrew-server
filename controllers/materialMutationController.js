const { Material, MaterialMutation, Cafe } = require("../models");
const { isAuthorizedForMaterial } = require("../middlewares/authHelpers");

exports.createMaterialMutation = async (req, res) => {
  const { materialId } = req.params;
  const { newStock, reason } = req.body;
  console.log("bbbbbbbbbbb" + newStock);
  try {
    // Authorization check
    const authorized = await isAuthorizedForMaterial(req.user, materialId);
    if (!authorized) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the latest mutation for the material to get the old stock
    const latestMutation = await MaterialMutation.findOne({
      where: { materialId },
      order: [["changeDate", "DESC"]], // Assuming changeDate determines the order of mutations
    });

    const oldStock = latestMutation ? latestMutation.newStock : 0; // Default to 0 if no previous mutation

    // Create the new mutation
    const newMutation = await MaterialMutation.create({
      materialId,
      oldStock,
      newStock,
      changeDate: new Date(),
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
    // Fetch all material mutations for the cafe
    const mutations = await MaterialMutation.findAll({
      include: [
        {
          model: Material,
          include: {
            model: Cafe,
            where: { cafeId: cafeId },
          },
        },
      ],
    });

    if (mutations.length === 0) {
      return res.status(404).json({
        error: "No material mutations found for the specified cafe ID.",
      });
    }

    // // Authorization check
    // const authorized = await isAuthorizedForMaterial(
    //   req.user,
    //   mutations[0].materialId
    // );
    // if (!authorized) {
    //   return res.status(401).json({ error: "Unauthorized" });
    // }

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
    const mutation = await MaterialMutation.findOne({
      where: { mutationId: mutationId },
      include: {
        model: Material,
        include: {
          model: Cafe,
        },
      },
    });

    if (!mutation) {
      return res.status(404).json({ error: "Material mutation not found." });
    }

    // Authorization check
    const authorized = await isAuthorizedForMaterial(
      req.user,
      mutation.materialId
    );
    if (!authorized) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.status(200).json(mutation);
  } catch (error) {
    console.error("Failed to retrieve material mutation:", error);
    res.status(500).json({ error: "Failed to retrieve material mutation." });
  }
};

// Get all material mutations by materialId
exports.getMaterialMutationsByMaterialId = async (req, res) => {
  const { materialId } = req.params;

  try {
    const mutations = await MaterialMutation.findAll({
      where: { materialId },
      include: {
        model: Material,
        include: {
          model: Cafe,
        },
      },
    });

    if (mutations.length === 0) {
      return res.status(404).json({
        error: "No material mutations found for the specified material ID.",
      });
    }

    // Authorization check
    const authorized = await isAuthorizedForMaterial(req.user, materialId);
    if (!authorized) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.status(200).json(mutations);
  } catch (error) {
    console.error("Failed to retrieve material mutations:", error);
    res.status(500).json({ error: "Failed to retrieve material mutations." });
  }
};
