// module.exports = {
//   up: async (queryInterface, Sequelize) => {
//     await queryInterface.addColumn("DailyReport", "createdAt", {
//       type: Sequelize.DATE,
//       allowNull: false,
//       defaultValue: Sequelize.NOW,
//     });
//     await queryInterface.addColumn("DailyReport", "updatedAt", {
//       type: Sequelize.DATE,
//       allowNull: false,
//       defaultValue: Sequelize.NOW,
//     });
//   },

//   down: async (queryInterface, Sequelize) => {
//     await queryInterface.removeColumn("DailyReport", "createdAt");
//     await queryInterface.removeColumn("DailyReport", "updatedAt");
//   },
// };
