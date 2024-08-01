"use strict";
module.exports = (sequelize, DataTypes) => {
  const Table = sequelize.define(
    "Table",
    {
      tableId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      xposition: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      yposition: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      cafeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
      },
      tableNo: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      tableCode: {
        type: DataTypes.STRING,
        allowNull: true, // or false if it should be required
      },
    },
    {
      tableName: "Table",
      freezeTableName: true,
    }
  );

  Table.associate = function (models) {
    Table.belongsTo(models.Cafe, { foreignKey: "cafeId" });
  };

  return Table;
};
