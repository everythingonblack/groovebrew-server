



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
          startDate = startOfDay.clone().subtract(7, "days").endOf("day").subtract(1, 'hours');
          endDate = startOfDay.clone().subtract(1, "days").endOf("day").add(1, 'hours');
          previousStartDate = startOfDay.clone().subtract(14, "days").endOf("day").subtract(1, 'hours');
          previousEndDate = startOfDay.clone().subtract(8, "days").endOf("day");
          break;
  
        case "monthly":
          startDate = startOfDay.clone().startOf("month").add(1, 'hours');
          endDate = startOfDay.clone().endOf("month");
          previousStartDate = startOfDay.clone().subtract(1, "month").startOf("month").add(1, 'hours');
          previousEndDate = startOfDay.clone().subtract(1, "month").endOf("month");
          break;
  
        case "yearly":
          startDate = startOfDay.clone().startOf("year").add(1, 'hours');
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
  
      const currentTotals = calculateTotals(currentReports);
      const previousTotals = calculateTotals(previousReports);
  
      // Calculate growth percentages
      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };
  
      const incomeGrowth = calculateGrowth(currentTotals.income, previousTotals.income);
      const outcomeGrowth = calculateGrowth(currentTotals.outcome, previousTotals.outcome);
      const transactionGrowth = calculateGrowth(currentTotals.transactions, previousTotals.transactions);
  // Aggregation for monthly (by weeks)
  const aggregateByWeeks = (reports, startDate, endDate) => {
    const weeks = [];
    let currentWeekStart = moment(startDate).startOf('week');
    let currentWeekEnd = currentWeekStart.clone().endOf('week');
  
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
      });
  
      currentWeekStart = currentWeekStart.clone().add(1, 'week');
      currentWeekEnd = currentWeekStart.clone().endOf('week');
    }
  
    return weeks;
  };
  // Aggregation for monthly (by periods of 7 days)
  const aggregateByPeriods = (reports, startDate, endDate) => {
    const periods = [];
    let currentPeriodStart = moment(startDate).startOf('month');
    let currentPeriodEnd = currentPeriodStart.clone().add(6, 'days'); // Each period lasts 7 days
  
    while (currentPeriodStart.isBefore(endDate)) {
      // Ensure the period doesn't exceed the month's end
      if (currentPeriodEnd.isAfter(endDate)) {
        currentPeriodEnd = endDate;
      }
  
      const periodData = reports.filter(report => {
        const reportDate = moment(report.date);
        return reportDate.isBetween(currentPeriodStart, currentPeriodEnd, null, '[)');
      });
  
      periods.push({
        dateRange: {
          start: currentPeriodStart.format('YYYY-MM-DD'),
          end: currentPeriodEnd.format('YYYY-MM-DD')
        },
        income: periodData.reduce((sum, report) => sum + report.totalIncome, 0),
        outcome: periodData.reduce((sum, report) => sum + report.totalOutcome, 0),
        transactions: periodData.reduce((sum, report) => sum + report.totalTransactions, 0),
      });
  
      // Move to the next period
      currentPeriodStart = currentPeriodStart.clone().add(7, 'days');
      currentPeriodEnd = currentPeriodStart.clone().add(6, 'days');
    }
  
    return periods;
  };
  
  // Modify the report generation to ensure proper aggregation
  let aggregatedCurrentReports, aggregatedPreviousReports;
  if (type === "monthly") {
    
    aggregatedCurrentReports = aggregateByPeriods(currentReports, startDate, endDate);
    // Aggregation for the previous month
    aggregatedPreviousReports = aggregateByPeriods(previousReports, previousStartDate, previousEndDate);
    
  } else if (type === "yearly") {
    // Adjust for previous year aggregation
    const previousYearStartDate = startOfDay.clone().subtract(1, 'year').startOf('year').add(1, 'hours');
    const previousYearEndDate = startOfDay.clone().subtract(1, 'year').endOf('year');
    aggregatedCurrentReports = aggregateByQuarters(currentReports, startDate, endDate);
    aggregatedPreviousReports = aggregateByQuarters(previousReports, previousYearStartDate, previousYearEndDate);
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
    aggregatedCurrentReports,  // Current aggregation (monthly or yearly)
    aggregatedPreviousReports,  // Previous aggregation (monthly or yearly)
  };
  
  return res.status(200).json(report);
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to generate report.' });
    }
  };
  