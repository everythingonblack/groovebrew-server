'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Coupon', { // Set table name as 'Coupon'
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      discountType: {
        type: Sequelize.ENUM('percentage', 'fixed'),
        allowNull: false,
        defaultValue: 'percentage',
      },
      discountValue: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      expirationDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      discountPeriods: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      discountEndDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'User',  // Direct reference to `User` (singular)
          key: 'userId',  // Primary key of the `User` table
        },
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Coupon'); // Ensure the table is dropped by name 'Coupon'
  },
};
