"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Cafe", "qrPayment", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "uploads/assets/sampelQRIS.png",
    });

    await queryInterface.changeColumn("Cafe", "qrBackground", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "uploads/assets/sampelQRBackground.png",
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Cafe", "qrPayment", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null, // Reverting to no default value
    });

    await queryInterface.changeColumn("Cafe", "qrBackground", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: "uploads/1736703782722.png", // Previous default value
    });
  },
};
