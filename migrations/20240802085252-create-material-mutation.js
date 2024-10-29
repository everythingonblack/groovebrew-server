"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("MaterialMutation", {
      mutationId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      materialId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Material",
          key: "materialId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      oldStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      newStock: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      changeDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("MaterialMutation");
  },
};
