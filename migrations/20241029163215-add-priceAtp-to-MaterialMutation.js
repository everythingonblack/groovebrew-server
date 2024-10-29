module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("MaterialMutation", "priceAtp", {
      type: Sequelize.INTEGER,
      allowNull: true, // Adjust this as needed
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("MaterialMutation", "priceAtp");
  },
};
