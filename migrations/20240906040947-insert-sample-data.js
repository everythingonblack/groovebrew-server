"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Clear all data from DailyReport
    await queryInterface.bulkDelete("DailyReport", null, {});

    // Insert new data
    await queryInterface.bulkInsert(
      "DailyReport",
      [
        // Data for 2024
        {
          reportDate: "2024-09-01",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 120.0,
          transactionCount: 10,
          createdAt: "2024-09-01 08:00:00",
          updatedAt: "2024-09-01 08:00:00",
        },
        {
          reportDate: "2024-09-02",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 130.0,
          transactionCount: 12,
          createdAt: "2024-09-02 08:00:00",
          updatedAt: "2024-09-02 08:00:00",
        },
        {
          reportDate: "2024-09-03",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 140.0,
          transactionCount: 14,
          createdAt: "2024-09-03 08:00:00",
          updatedAt: "2024-09-03 08:00:00",
        },
        {
          reportDate: "2024-09-04",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 110.0,
          transactionCount: 8,
          createdAt: "2024-09-04 08:00:00",
          updatedAt: "2024-09-04 08:00:00",
        },
        {
          reportDate: "2024-09-05",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 160.0,
          transactionCount: 15,
          createdAt: "2024-09-05 08:00:00",
          updatedAt: "2024-09-05 08:00:00",
        },
        {
          reportDate: "2024-09-06",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 200.0,
          transactionCount: 20,
          createdAt: "2024-09-06 08:00:00",
          updatedAt: "2024-09-06 08:00:00",
        },
        {
          reportDate: "2024-08-30",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 90.0,
          transactionCount: 7,
          createdAt: "2024-08-30 08:00:00",
          updatedAt: "2024-08-30 08:00:00",
        },
        {
          reportDate: "2024-08-31",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 120.0,
          transactionCount: 9,
          createdAt: "2024-08-31 08:00:00",
          updatedAt: "2024-08-31 08:00:00",
        },
        {
          reportDate: "2024-08-29",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 180.0,
          transactionCount: 16,
          createdAt: "2024-08-29 08:00:00",
          updatedAt: "2024-08-29 08:00:00",
        },
        {
          reportDate: "2024-07-31",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 100.0,
          transactionCount: 5,
          createdAt: "2024-07-31 08:00:00",
          updatedAt: "2024-07-31 08:00:00",
        },
        {
          reportDate: "2024-07-30",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 110.0,
          transactionCount: 6,
          createdAt: "2024-07-30 08:00:00",
          updatedAt: "2024-07-30 08:00:00",
        },
        {
          reportDate: "2024-07-29",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 150.0,
          transactionCount: 12,
          createdAt: "2024-07-29 08:00:00",
          updatedAt: "2024-07-29 08:00:00",
        },
        {
          reportDate: "2024-06-30",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 80.0,
          transactionCount: 4,
          createdAt: "2024-06-30 08:00:00",
          updatedAt: "2024-06-30 08:00:00",
        },
        {
          reportDate: "2024-06-29",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 90.0,
          transactionCount: 5,
          createdAt: "2024-06-29 08:00:00",
          updatedAt: "2024-06-29 08:00:00",
        },
        {
          reportDate: "2024-06-28",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 130.0,
          transactionCount: 10,
          createdAt: "2024-06-28 08:00:00",
          updatedAt: "2024-06-28 08:00:00",
        },

        // Data for 2023
        {
          reportDate: "2023-09-01",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 100.0,
          transactionCount: 6,
          createdAt: "2023-09-01 08:00:00",
          updatedAt: "2023-09-01 08:00:00",
        },
        {
          reportDate: "2023-09-02",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 110.0,
          transactionCount: 7,
          createdAt: "2023-09-02 08:00:00",
          updatedAt: "2023-09-02 08:00:00",
        },
        {
          reportDate: "2023-09-03",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 140.0,
          transactionCount: 12,
          createdAt: "2023-09-03 08:00:00",
          updatedAt: "2023-09-03 08:00:00",
        },
        {
          reportDate: "2023-08-30",
          cafeId: 5,
          favoriteItemId: 6,
          totalIncome: 80.0,
          transactionCount: 5,
          createdAt: "2023-08-30 08:00:00",
          updatedAt: "2023-08-30 08:00:00",
        },
        {
          reportDate: "2023-08-31",
          cafeId: 5,
          favoriteItemId: 7,
          totalIncome: 90.0,
          transactionCount: 6,
          createdAt: "2023-08-31 08:00:00",
          updatedAt: "2023-08-31 08:00:00",
        },
        {
          reportDate: "2023-08-29",
          cafeId: 5,
          favoriteItemId: 8,
          totalIncome: 130.0,
          transactionCount: 8,
          createdAt: "2023-08-29 08:00:00",
          updatedAt: "2023-08-29 08:00:00",
        },
      ],
      {}
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Optional: Restore the original state if needed
    // For example, you can insert old data back here
    // await queryInterface.bulkInsert('DailyReport', oldData, {});
  },
};
