module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column already exists
    const table = await queryInterface.describeTable('Cafe');
    if (!table['cafeIdentifyName']) {
      // If the column doesn't exist, add it
      await queryInterface.addColumn('Cafe', 'cafeIdentifyName', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the column
    await queryInterface.removeColumn('Cafe', 'cafeIdentifyName');
  }
};
