// authHelpers.js
const { Cafe, Material } = require("../models");

const isAuthorizedForMaterial = async (user, materialId) => {
  try {
    // Fetch the material and its related cafe
    const material = await Material.findByPk(materialId, { include: Cafe });
    if (!material) return false;

    const cafe = material.Cafe;
    if (user.roleId === 1) {
      // Admin
      return cafe.ownerId === user.userId;
    } else if (user.roleId === 2) {
      // Regular user
      return user.cafeId === cafe.cafeId;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Failed to authorize user:", error);
    return false;
  }
};

module.exports = {
  isAuthorizedForMaterial,
};
