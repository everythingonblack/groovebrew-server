'use strict';

module.exports = (sequelize, DataTypes) => {
  const DailyReport = sequelize.define('DailyReport', {
    dailyReportId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cafeId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'Cafe',
        key: 'cafeId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },

    // Hourly Income, Outcome, Transactions, and MaterialIds (from MaterialMutation)
    hour0To3Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour0To3Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour0To3Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour0To3MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour3To6Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour3To6Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour3To6Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour3To6MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour6To9Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour6To9Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour6To9Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour6To9MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour9To12Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour9To12Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour9To12Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour9To12MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour12To15Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour12To15Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour12To15Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour12To15MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour15To18Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour15To18Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour15To18Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour15To18MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour18To21Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour18To21Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour18To21Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour18To21MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour21To24Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour21To24Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour21To24Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour21To24MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    // Total Income, Outcome, and Transaction count for the entire day
    totalIncome: {
      type: DataTypes.FLOAT, // Sum of all hourly income
      allowNull: true
    },
    totalOutcome: {
      type: DataTypes.FLOAT, // Sum of all hourly outcomes
      allowNull: true
    },
    totalTransactions: {
      type: DataTypes.FLOAT, // Sum of all hourly transaction counts
      allowNull: true
    },

    // New variable for total promotional spend
    totalPromoSpend: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    },
  }, {
    tableName: 'DailyReport',
    freezeTableName: true
  });

  DailyReport.associate = function(models) {
    // Define any necessary relationships here if needed
    // DailyReport.belongsTo(models.Transaction, { foreignKey: 'transactionId' });
    // DailyReport.belongsTo(models.Item, { foreignKey: 'itemId' });
  };

  return DailyReport;
};