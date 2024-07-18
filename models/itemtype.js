module.exports = (sequelize, DataTypes) => {
  const ItemType = sequelize.define('ItemType', {
    itemTypeId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true
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
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'ItemType',
    freezeTableName: true,
    timestamps: true
  });

  ItemType.associate = function(models) {
    ItemType.belongsTo(models.Cafe, { foreignKey: 'cafeId' });
    ItemType.hasMany(models.Item, { foreignKey: 'itemTypeId', as: 'itemList' });
  };

  return ItemType;
};
