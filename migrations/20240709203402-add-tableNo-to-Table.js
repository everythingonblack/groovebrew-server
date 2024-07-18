'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Table', 'tableNo', {
      type: Sequelize.INTEGER,
      allowNull: true, // Modify as per your requirement
      defaultValue: null, // Modify as per your requirement
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Table', 'tableNo');
  }
};
