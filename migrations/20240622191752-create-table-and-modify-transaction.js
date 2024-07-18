'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Table', {
      tableId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      xposition: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      yposition: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      cafeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cafe',  // Correctly references the cafeId
          key: 'cafeId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addColumn('Transaction', 'tableId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'Table',
        key: 'tableId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      allowNull: true  // Assuming a transaction can exist without a tableId
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transaction', 'tableId');
    await queryInterface.dropTable('Table');
  }
};
