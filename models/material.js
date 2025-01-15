const { Sequelize, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Material = sequelize.define(
    "Material",
    {
      materialId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      unit: {
        type: DataTypes.ENUM(
          "kilogram",
          "liter",
          "piece",
          "kuintal",
          "ons",
          "gram",
          "meter",
          "pack",
          "sachet",
          "box"
        ),
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cafeId: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      removed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false, // Default value for the new column
        allowNull: false,
      },
    },
    {
      tableName: "Material",
      freezeTableName: true,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  Material.associate = function (models) {
    Material.belongsTo(models.Cafe, { foreignKey: "cafeId" });
  };

  return Material;
};
