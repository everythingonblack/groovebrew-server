exports.getReport = async (req, res) => {
  try {
    const { cafeId } = req.params;
    const { type } = req.query; // "yesterday", "weekly", "monthly", "yearly"

    // Fetch cafe's timezone (ensure this data exists in your database)
    const cafe = await Cafe.findByPk(cafeId);
    if (!cafe || !cafe.timezone) {
      return res.status(404).json({ error: 'Cafe not found or timezone not set.' });
    }
    const timezone = cafe.timezone; // e.g., 'Asia/Jakarta' 'Pacific/Kiritimati'

    // Determine the date range based on the type relative to the cafe's timezone
    let startDate, endDate, previousStartDate, previousEndDate;

    const today = moment.tz(timezone); // Get the current time in cafe's timezone
    const startOfDay = today.clone().startOf('day'); // 00:00:00 in cafe's timezone

    // Convert both to UTC
    const todayUTC = today.clone().utc(); // Convert the current time to UTC
    const startOfDayUTC = startOfDay.clone().utc(); // Convert the start of the day to UTC

    console.log('Today (Local):', today.format());
    console.log('Start of Day (Local):', startOfDay.format());
    console.log('Today (UTC):', todayUTC.format());
    console.log('Start of Day (UTC):', startOfDayUTC.format());

    // Switch based on the type of report
    switch (type) {
      case "yesterday":
        startDate = startOfDayUTC.clone().subtract(1, "days").subtract(1, 'hours');
        endDate = startOfDayUTC.clone().add(1, 'hours');
        previousStartDate = startOfDayUTC.clone().subtract(1, "days").subtract(1, 'hours');
        previousEndDate = startOfDayUTC.clone().subtract(1, "days").add(1, 'hours');
        break;

      case "weekly":
        startDate = startOfDay.clone().subtract(7, "days").endOf("day").subtract(1, 'hours');;
        endDate = startOfDay.clone().subtract(1, "days").endOf("day").add(1, 'hours');
        previousStartDate = startOfDay.clone().subtract(14, "days").endOf("day").subtract(1, 'hours');;
        previousEndDate = startOfDay.clone().subtract(8, "days").endOf("day");
        break;

      case "monthly":
        startDate = startOfDay.clone().startOf("month").add(1, 'hours');;
        endDate = startOfDay.clone().endOf("month");
        previousStartDate = startOfDay.clone().subtract(1, "month").startOf("month").add(1, 'hours');
        previousEndDate = startOfDay.clone().subtract(1, "month").endOf("month");
        break;

      case "yearly":
        startDate = startOfDay.clone().startOf("year").add(1, 'hours');;
        endDate = startOfDay.clone().endOf("year");
        previousStartDate = startOfDay.clone().subtract(1, "year").startOf("year").add(1, 'hours');
        previousEndDate = startOfDay.clone().subtract(1, "year").endOf("year");
        break;

      default:
        return res.status(400).json({ error: 'Invalid report type.' });
    }
// Fetch reports for the current period
const currentReports = await DailyReport.findAll({
  where: {
    cafeId,
    date: { [Op.gte]: startDate.toDate(), [Op.lt]: endDate.toDate() },
  },
  order: [['date', 'ASC']], // Order by date in ascending order
});

// Fetch reports for the previous period
const previousReports = await DailyReport.findAll({
  where: {
    cafeId,
    date: { [Op.gte]: previousStartDate.toDate(), [Op.lt]: previousEndDate.toDate() },
  },
  order: [['date', 'ASC']], // Order by date in ascending order
});

    // Helper to calculate totals
    const calculateTotals = (reports) => {
      return reports.reduce(
        (totals, report) => {
          totals.income += report.totalIncome;
          totals.outcome += report.totalOutcome;
          totals.transactions += report.totalTransactions;
          return totals;
        },
        { income: 0, outcome: 0, transactions: 0 }
      );
    };
    
    console.log(currentReports)
    let sortedReports = [...currentReports];
    // Sort by date (ascending order - oldest first)
    sortedReports = sortedReports.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Remove the oldest report (first element)
    sortedReports.shift();

    const currentReports2 = type === 'yesterday' ? sortedReports : currentReports;
    console.log(currentReports)

    const currentTotals = calculateTotals(currentReports2);
    const previousTotals = calculateTotals(previousReports);

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const incomeGrowth = calculateGrowth(currentTotals.income, previousTotals.income);
    const outcomeGrowth = calculateGrowth(currentTotals.outcome, previousTotals.outcome);
    const transactionGrowth = calculateGrowth(currentTotals.transactions, previousTotals.transactions);

    // Aggregate sold items
    const soldItems = {};
    let totalSoldItems = 0;

    currentReports2.forEach(report => {
      for (let i = 0; i <= 23; i++) {
        const hourTransactions = report[`hour${i}To${i + 3}Transactions`]; // e.g. hour0To3Transactions
        if (hourTransactions && hourTransactions.length > 0) {
          hourTransactions.forEach(transaction => {
            const { itemId, sold, itemName } = transaction;
            if (!soldItems[itemId]) {
              soldItems[itemId] = { sold: 0, itemName };
            }
            soldItems[itemId].sold += sold;
            soldItems[itemId].itemName = itemName;
            totalSoldItems += sold;
          });
        }
      }
    });

    const itemPercentage = Object.keys(soldItems).map(itemId => {
      const itemData = soldItems[itemId];
      const percentage = ((itemData.sold / totalSoldItems) * 100).toFixed(2);
      return {
        itemId: Number(itemId),
        sold: itemData.sold,
        itemName: itemData.itemName || '',
        percentage,
      };
    }).sort((a, b) => b.sold - a.sold); // Sort by 'sold' in descending order

    // Aggregation for monthly (by weeks)
    const aggregateByWeeks = (reports) => {
      const weeks = [];
      let currentWeekStart = moment(startDate).startOf('week');
      let currentWeekEnd = currentWeekStart.clone().endOf('week');

      // Ensure there's always a week entry for each period, even if no data is present
      while (currentWeekStart.isBefore(endDate)) {
        const weekData = reports.filter(report => {
          const reportDate = moment(report.date);
          return reportDate.isBetween(currentWeekStart, currentWeekEnd, null, '[)');
        });

        weeks.push({
          dateRange: {
            start: currentWeekStart.format('YYYY-MM-DD'),
            end: currentWeekEnd.format('YYYY-MM-DD')
          },
          income: weekData.reduce((sum, report) => sum + report.totalIncome, 0),
          outcome: weekData.reduce((sum, report) => sum + report.totalOutcome, 0),
          transactions: weekData.reduce((sum, report) => sum + report.totalTransactions, 0),
          itemSales: []
        });

        currentWeekStart = currentWeekStart.clone().add(1, 'week');
        currentWeekEnd = currentWeekStart.clone().endOf('week');
      }

      return weeks;
    };

    // Aggregation for yearly (by months)
    const aggregateByMonths = (reports) => {
      const months = [];
      let currentMonthStart = moment(startDate).startOf('month');
      let currentMonthEnd = currentMonthStart.clone().endOf('month');

      // Ensure there's always a month entry for each period, even if no data is present
      while (currentMonthStart.isBefore(endDate)) {
        const monthData = reports.filter(report => {
          const reportDate = moment(report.date);
          return reportDate.isBetween(currentMonthStart, currentMonthEnd, null, '[)');
        });

        months.push({
          dateRange: {
            start: currentMonthStart.format('YYYY-MM-DD'),
            end: currentMonthEnd.format('YYYY-MM-DD')
          },
          income: monthData.reduce((sum, report) => sum + report.totalIncome, 0),
          outcome: monthData.reduce((sum, report) => sum + report.totalOutcome, 0),
          transactions: monthData.reduce((sum, report) => sum + report.totalTransactions, 0),
          itemSales: []
        });

        currentMonthStart = currentMonthStart.clone().add(1, 'month');
        currentMonthEnd = currentMonthStart.clone().endOf('month');
      }

      return months;
    };

    // Handle monthly and yearly aggregation
    let aggregatedReports;
    if (type === "monthly") {
      aggregatedReports = aggregateByWeeks(currentReports);
    } else if (type === "yearly") {
      aggregatedReports = aggregateByMonths(currentReports);
    }

    // Prepare the report
    const report = {
      type,
      dateRange: { today, startDate, endDate, previousStartDate, previousEndDate },
      currentTotals,
      previousTotals,
      growth: {
        incomeGrowth,
        outcomeGrowth,
        transactionGrowth,
      },
      transactionGraph: currentReports.map((r) => ({
        date: r.date,
        hour0To3Transactions: r.hour0To3Transactions,
        hour3To6Transactions: r.hour3To6Transactions,
        hour6To9Transactions: r.hour6To9Transactions,
        hour9To12Transactions: r.hour9To12Transactions,
        hour12To15Transactions: r.hour12To15Transactions,
        hour15To18Transactions: r.hour15To18Transactions,
        hour18To21Transactions: r.hour18To21Transactions,
        hour21To24Transactions: r.hour21To24Transactions,
      })),
      materialGraph: currentReports.map((r) => ({
        date: r.date,
        hour0To3MaterialIds: r.hour0To3MaterialIds,
        hour3To6MaterialIds: r.hour3To6MaterialIds,
        hour6To9MaterialIds: r.hour6To9MaterialIds,
        hour9To12MaterialIds: r.hour9To12MaterialIds,
        hour12To15MaterialIds: r.hour12To15MaterialIds,
        hour15To18MaterialIds: r.hour15To18MaterialIds,
        hour18To21MaterialIds: r.hour18To21MaterialIds,
        hour21To24MaterialIds: r.hour21To24MaterialIds,
      })),
      itemSales: itemPercentage, // Add item sales data here
      aggregatedReports, // Add aggregated reports for monthly or yearly
    };

    // Send the response
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'An error occurred while fetching the report.' });
  }
};