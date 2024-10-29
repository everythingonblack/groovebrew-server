'use strict';
module.exports = (sequelize, DataTypes) => {
  const DailyReport = sequelize.define('DailyReport', {
    dailyReportId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reportDate: {
      type: DataTypes.DATEONLY, // stores only the date without time
      allowNull: false
    },
    cafeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Cafe',
        key: 'cafeId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    itemsSold: {
      type: DataTypes.JSON, // JSON format, compatible with PostgreSQL
      allowNull: true // Now itemsSold can be nullable
    },
    materialsPurchased: {
      type: DataTypes.JSON, // JSON format for materials purchased
      allowNull: true // Can be set to false if mandatory
    }
  }, {
    tableName: 'DailyReport',
    freezeTableName: true
  });

  return DailyReport;
};
