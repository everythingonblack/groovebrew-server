const { DailyReport, Cafe, Item } = require("../models"); // Adjust the path as needed

// Fetch all daily reports for a specific cafeId
exports.getReportsByCafeId = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const reports = await DailyReport.findAll({
      where: { cafeId },
      include: [
        { model: Cafe, attributes: ["name"] },
        { model: Item, as: "FavoriteItem", attributes: ["name"] },
      ],
    });

    if (!reports.length)
      return res.status(404).json({ error: "No reports found for this cafe." });

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new daily report
exports.createReport = async (req, res) => {
  const {
    cafeId,
    reportDate,
    favoriteItemId,
    totalIncome,
    transactionCount,
    materialMutationIds,
  } = req.body;

  try {
    const newReport = await DailyReport.create({
      cafeId,
      reportDate,
      favoriteItemId,
      totalIncome,
      transactionCount,
      materialMutationIds,
    });

    res.status(201).json(newReport);
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
