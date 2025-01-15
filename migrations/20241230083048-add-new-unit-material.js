module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Material", "unit", {
      type: Sequelize.ENUM(
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
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("Material", "unit", {
      type: Sequelize.ENUM(
        "kilogram",
        "liter",
        "piece",
        "kuintal",
        "ons",
        "gram",
        "meter"
      ),
      allowNull: false,
    });
  },
};
