'use strict';
module.exports = (sequelize, DataTypes) => {
  const DetailedTransaction = sequelize.define('DetailedTransaction', {
    detailedTransactionId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    transactionId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Transaction',
        key: 'transactionId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    itemId: {
      type: DataTypes.INTEGER,
      references: {
        model: 'Item',
        key: 'itemId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true  // Changed to true
    },
    promoPrice: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true  // Changed to true
    }
  }, {
    tableName: 'DetailedTransaction',
    freezeTableName: true
  });

  DetailedTransaction.associate = function(models) {
    DetailedTransaction.belongsTo(models.Transaction, { foreignKey: 'transactionId' });
    DetailedTransaction.belongsTo(models.Item, { foreignKey: 'itemId' });
  };

  return DetailedTransaction;
};
