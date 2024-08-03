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
        type: DataTypes.ENUM("kilogram", "liter", "piece"),
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
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Cafe",
          key: "cafeId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Removed stock field
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
