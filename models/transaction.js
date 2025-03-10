"use strict";
module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define(
    "Transaction",
    {
      transactionId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "User",
          key: "userId",
        },
      },
      user_email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      clerkId: {
        type: DataTypes.INTEGER,
        references: {
          model: "User",
          key: "userId",
        },
        allowNull: true,
      },
      tableId: {
        type: DataTypes.INTEGER,
        references: {
          model: "Table",
          key: "tableId",
        },
        allowNull: true,
      },
      cafeId: {
        type: DataTypes.STRING,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
        allowNull: false,
      },
      payment_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      serving_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      is_paid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      confirmed: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      paymentClaimed: {
        // Added column
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "Transaction",
      freezeTableName: true,
    }
  );

  Transaction.associate = function (models) {
    Transaction.belongsTo(models.User, { as: "user", foreignKey: "userId" });
    Transaction.belongsTo(models.User, { as: "clerk", foreignKey: "clerkId" });
    Transaction.belongsTo(models.Table, { foreignKey: "tableId" });
    Transaction.belongsTo(models.Cafe, { foreignKey: "cafeId" });
    Transaction.hasMany(models.DetailedTransaction, {
      foreignKey: "transactionId",
    });
  };

  return Transaction;
};
