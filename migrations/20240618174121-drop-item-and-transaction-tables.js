'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop Transaction table first (due to foreign key dependency)
    await queryInterface.dropTable('Transaction');
    
    // Drop Item table after Transaction table is dropped
    await queryInterface.dropTable('Item');
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate Item table with original structure
    await queryInterface.createTable('Item', {
      itemId: {
        allowNull: false,
        primaryKey: true,
        autoIncrement: true, // autoIncrement should be true
        type: Sequelize.INTEGER // Change type to INTEGER for auto-increment
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

    // Recreate Transaction table with original structure
    await queryInterface.createTable('Transaction', {
      transactionId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      itemId: {
        type: Sequelize.INTEGER, // Change type to INTEGER to match the type in Item table
        allowNull: false,
        references: {
          model: 'Item',
          key: 'itemId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      qty: {
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
      tableId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Table',
          key: 'tableId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      payment_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      is_paid: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
  }
};
