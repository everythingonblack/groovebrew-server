const { Sequelize, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MaterialMutation = sequelize.define(
    "MaterialMutation",
    {
      mutationId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      materialId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Material",
          key: "materialId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      oldStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      newStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      changeDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "MaterialMutation",
      freezeTableName: true,
      timestamps: true,
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    }
  );

  MaterialMutation.associate = function (models) {
    MaterialMutation.belongsTo(models.Material, { foreignKey: "materialId" });
  };

  return MaterialMutation;
};
