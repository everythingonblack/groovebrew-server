"use strict";

const Sequelize = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  const Coupon = sequelize.define("Coupon", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    discountType: {
      type: DataTypes.ENUM("percentage", "fixed"),
      allowNull: false,
      defaultValue: "percentage",
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    expirationDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    discountPeriods: {
      type: DataTypes.INTEGER, 
      allowNull: false,
    },
    discountEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "User",  
        key: "userId",  
      },
    },
  },{
    tableName: "Coupon",
    freezeTableName: true,
  });

  Coupon.associate = function (models) {
    // A Coupon belongs to one User
    Coupon.belongsTo(models.User, { foreignKey: "userId", onDelete: "SET NULL" });
  };

  return Coupon;
};
