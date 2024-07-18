'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create Item table
    await queryInterface.createTable('Item', {
      itemId: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        type: Sequelize.INTEGER // Changed type to INTEGER for auto-increment
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      cafeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Cafe',
          key: 'cafeId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create Transaction table
    await queryInterface.createTable('Transaction', {
      transactionId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      itemId: {
        type: Sequelize.INTEGER, // Changed type to INTEGER to match Item.itemId
        allowNull: false,
        references: {
          model: 'Item',
          key: 'itemId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stock: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      clerkId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'userId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Drop Transaction table
    await queryInterface.dropTable('Transaction');

    // Drop Item table
    await queryInterface.dropTable('Item');
  }
};
