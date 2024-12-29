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
      type: DataTypes.DATEONLY, // YYYY-MM-DD format
      allowNull: false
    },

    // Hourly Income, Outcome, Transactions, and MaterialIds (from MaterialMutation)
    hour1To3Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour1To3Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour1To3Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour1To3MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour4To6Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour4To6Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour4To6Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour4To6MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour7To9Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour7To9Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour7To9Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour7To9MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour10To12Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour10To12Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour10To12Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour10To12MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour13To15Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour13To15Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour13To15Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour13To15MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour16To18Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour16To18Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour16To18Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour16To18MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour19To21Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour19To21Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour19To21Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour19To21MaterialIds: {
      type: DataTypes.JSON, // Store materials sold from MaterialMutation as JSON array
      allowNull: true
    },

    hour22To24Income: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour22To24Outcome: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    hour22To24Transactions: {
      type: DataTypes.JSON, // Store TransactionIds as JSON array
      allowNull: true
    },
    hour22To24MaterialIds: {
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
