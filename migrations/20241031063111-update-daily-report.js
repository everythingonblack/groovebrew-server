'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Drop the existing DailyReport table
    await queryInterface.dropTable('DailyReport');

    // Step 2: Create the new DailyReport table with the updated structure
    await queryInterface.createTable('DailyReport', {
      dailyReportId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      cafeId: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: 'Cafe',
          key: 'cafeId'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },

      hour1To3Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour1To3Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour1To3Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour1To3MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour4To6Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour4To6Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour4To6Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour4To6MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour7To9Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour7To9Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour7To9Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour7To9MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour10To12Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour10To12Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour10To12Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour10To12MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour13To15Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour13To15Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour13To15Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour13To15MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour16To18Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour16To18Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour16To18Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour16To18MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour19To21Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour19To21Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour19To21Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour19To21MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      hour22To24Income: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour22To24Outcome: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      hour22To24Transactions: {
        type: Sequelize.JSON,
        allowNull: true
      },
      hour22To24MaterialIds: {
        type: Sequelize.JSON,
        allowNull: true
      },

      totalIncome: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      totalOutcome: {
        type: Sequelize.FLOAT,
        allowNull: true
      },
      totalTransactions: {
        type: Sequelize.FLOAT,
        allowNull: true
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If you need to undo this migration (rollback), you can remove the new table
    await queryInterface.dropTable('DailyReport');
  }
};
