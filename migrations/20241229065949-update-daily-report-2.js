'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Rename columns to match new structure
    await queryInterface.renameColumn('DailyReport', 'hour1To3Income', 'hour0To3Income');
    await queryInterface.renameColumn('DailyReport', 'hour1To3Outcome', 'hour0To3Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour1To3Transactions', 'hour0To3Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour1To3MaterialIds', 'hour0To3MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour4To6Income', 'hour3To6Income');
    await queryInterface.renameColumn('DailyReport', 'hour4To6Outcome', 'hour3To6Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour4To6Transactions', 'hour3To6Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour4To6MaterialIds', 'hour3To6MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour7To9Income', 'hour6To9Income');
    await queryInterface.renameColumn('DailyReport', 'hour7To9Outcome', 'hour6To9Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour7To9Transactions', 'hour6To9Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour7To9MaterialIds', 'hour6To9MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour10To12Income', 'hour9To12Income');
    await queryInterface.renameColumn('DailyReport', 'hour10To12Outcome', 'hour9To12Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour10To12Transactions', 'hour9To12Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour10To12MaterialIds', 'hour9To12MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour13To15Income', 'hour12To15Income');
    await queryInterface.renameColumn('DailyReport', 'hour13To15Outcome', 'hour12To15Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour13To15Transactions', 'hour12To15Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour13To15MaterialIds', 'hour12To15MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour16To18Income', 'hour15To18Income');
    await queryInterface.renameColumn('DailyReport', 'hour16To18Outcome', 'hour15To18Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour16To18Transactions', 'hour15To18Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour16To18MaterialIds', 'hour15To18MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour19To21Income', 'hour18To21Income');
    await queryInterface.renameColumn('DailyReport', 'hour19To21Outcome', 'hour18To21Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour19To21Transactions', 'hour18To21Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour19To21MaterialIds', 'hour18To21MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour22To24Income', 'hour21To24Income');
    await queryInterface.renameColumn('DailyReport', 'hour22To24Outcome', 'hour21To24Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour22To24Transactions', 'hour21To24Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour22To24MaterialIds', 'hour21To24MaterialIds');
  },

  down: async (queryInterface, Sequelize) => {
    // Revert column names back to the original structure
    await queryInterface.renameColumn('DailyReport', 'hour0To3Income', 'hour1To3Income');
    await queryInterface.renameColumn('DailyReport', 'hour0To3Outcome', 'hour1To3Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour0To3Transactions', 'hour1To3Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour0To3MaterialIds', 'hour1To3MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour3To6Income', 'hour4To6Income');
    await queryInterface.renameColumn('DailyReport', 'hour3To6Outcome', 'hour4To6Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour3To6Transactions', 'hour4To6Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour3To6MaterialIds', 'hour4To6MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour6To9Income', 'hour7To9Income');
    await queryInterface.renameColumn('DailyReport', 'hour6To9Outcome', 'hour7To9Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour6To9Transactions', 'hour7To9Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour6To9MaterialIds', 'hour7To9MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour9To12Income', 'hour10To12Income');
    await queryInterface.renameColumn('DailyReport', 'hour9To12Outcome', 'hour10To12Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour9To12Transactions', 'hour10To12Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour9To12MaterialIds', 'hour10To12MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour12To15Income', 'hour13To15Income');
    await queryInterface.renameColumn('DailyReport', 'hour12To15Outcome', 'hour13To15Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour12To15Transactions', 'hour13To15Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour12To15MaterialIds', 'hour13To15MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour15To18Income', 'hour16To18Income');
    await queryInterface.renameColumn('DailyReport', 'hour15To18Outcome', 'hour16To18Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour15To18Transactions', 'hour16To18Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour15To18MaterialIds', 'hour16To18MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour18To21Income', 'hour19To21Income');
    await queryInterface.renameColumn('DailyReport', 'hour18To21Outcome', 'hour19To21Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour18To21Transactions', 'hour19To21Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour18To21MaterialIds', 'hour19To21MaterialIds');

    await queryInterface.renameColumn('DailyReport', 'hour21To24Income', 'hour22To24Income');
    await queryInterface.renameColumn('DailyReport', 'hour21To24Outcome', 'hour22To24Outcome');
    await queryInterface.renameColumn('DailyReport', 'hour21To24Transactions', 'hour22To24Transactions');
    await queryInterface.renameColumn('DailyReport', 'hour21To24MaterialIds', 'hour22To24MaterialIds');
  }
};
