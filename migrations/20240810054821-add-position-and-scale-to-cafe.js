"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Cafe", "qrPayment", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Cafe", "qrBackground", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("Cafe", "xposition", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("Cafe", "yposition", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("Cafe", "scale", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Cafe", "qrPayment");
    await queryInterface.removeColumn("Cafe", "qrBackground");
    await queryInterface.removeColumn("Cafe", "xposition");
    await queryInterface.removeColumn("Cafe", "yposition");
    await queryInterface.removeColumn("Cafe", "scale");
  },
};
