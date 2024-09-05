const {
  User,
  Cafe,
  Session,
  Transaction,
  DetailedTransaction,
  ItemType,
  Item,
  Table,
  Material,
  MaterialMutation,
  DailyReport,
  sequelize,
} = require("../models");
const { Op, fn, col } = require("sequelize");
const { Sequelize } = require("sequelize");
const moment = require("moment");
const { sendEmail } = require("../services/emailServices");
const { generateUniqueUsername } = require("../helpers/createGuestHelper");
const userHelper = require("../services/userHelper");

// Helper function to generate a token
function generateToken() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
exports.transactionFromClerk = async (req, res) => {
  console.log("fromclerk");
  const { cafeId } = req.params;

  if (req.user.cafeId != cafeId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { user_email, payment_type, serving_type, tableNo, transactions } =
    req.body;

  let userEmail = user_email != null ? user_email : "null";
  if (userEmail != "null" && !isValidEmail(userEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  let paymentType = payment_type === "cash" ? "cash" : "cashless";
  let servingType = serving_type === "pickup" ? "pickup" : "serve";
  let tableId;

  if (tableNo || servingType == "serve") {
    const table = await Table.findOne({
      where: { cafeId: cafeId, tableNo: tableNo },
    });
    if (!table) return res.status(404).json({ error: "Table not found" });

    tableId = table.tableId;
  }

  const user = await User.findOne({ where: { email: user_email } });
  let userId;
  if (!user) {
    // Create user with a default password
    const newUsername = await generateUniqueUsername();
    const newUser = await User.create({
      email: userEmail,
      username: newUsername,
      password: "unsetunsetunset",
      roleId: 3,
    });
    userId = newUser.userId;
  } else {
    userId = user.userId;
  }

  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      const newTransaction = await Transaction.create(
        {
          clerkId: req.user.userId,
          userId: userId,
          cafeId: cafeId,
          payment_type: paymentType,
          serving_type: servingType,
          confirmed: 1,
          tableId: servingType === "serve" ? tableId : null,
          is_paid: paymentType === "cash" ? true : false,
        },
        { transaction: t }
      );

      // Create detailed transaction records
      const detailedTransactions = transactions.items.map(async (item) => {
        await DetailedTransaction.create(
          {
            transactionId: newTransaction.transactionId,
            itemId: item.itemId,
            qty: item.qty,
          },
          { transaction: t }
        );
      });

      await Promise.all(detailedTransactions);
      if (userEmail != "null") {
        if (!user) {
          const token = generateToken();
          await Session.create({ userId: userId, token }, { transaction: t });

          // Send an email to create an account
          await sendEmail(userEmail, cafe, "invite", transactions.items, token);
        } else if (user.password === "unsetunsetunset") {
          // Send email to complete registration
          const token = generateToken();
          await Session.create({ userId: userId, token }, { transaction: t });
          await sendEmail(
            userEmail,
            cafe,
            "completeRegistration",
            transactions.items,
            token
          );
        } else {
          // Send transaction notification email
          await sendEmail(
            userEmail,
            cafe,
            "transactionNotification",
            transactions.items
          );
        }
      }
    });

    res.status(201).json({ message: "Transactions created successfully" });
  } catch (error) {
    console.error("Error creating transactions:", error);
    res.status(500).json({ message: "Failed to create transactions" });
  }
};

exports.transactionFromGuestSide = async (req, res) => {
  console.log("fromguestside");
  //userId is guest who transacte
  const token = req.header("Authorization")?.replace("Bearer ", "");
  const { user_email, payment_type, serving_type, tableNo, transactions } =
    req.body;

  const checkSession = await userHelper.verifyGuestSideSession(token);
  if (!checkSession)
    return res.status(404).json({ error: "Session not found" });

  const clerkOf = await User.findByPk(checkSession[0]);
  if (!clerkOf) return res.status(404).json({ error: "Clerk not found" });

  const cafeId = clerkOf.cafeId;

  const cafe = await Cafe.findByPk(cafeId);
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });

  let paymentType = payment_type === "cash" ? "cash" : "cashless";
  let servingType = serving_type === "pickup" ? "pickup" : "serve";
  let tableId;

  if (servingType == "serve") {
    const table = await Table.findOne({
      where: { cafeId: cafeId, tableNo: tableNo },
    });
    if (!table) return res.status(404).json({ error: "Table not found" });

    tableId = table.tableId;
  }

  let userEmail = user_email != null ? user_email : "null";
  if (userEmail != "null" && !isValidEmail(userEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  const user = await User.findOne({ where: { email: user_email } });

  let userId;
  if (!user) {
    // Create user with a default password
    const newUsername = await generateUniqueUsername();
    const newUser = await User.create({
      email: userEmail,
      username: newUsername,
      password: "unsetunsetunset",
      roleId: 3,
    });
    userId = newUser.userId;
  } else {
    userId = user.userId;
  }
  let newTransaction = null;
  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      newTransaction = await Transaction.create(
        {
          userId: userId,
          cafeId: cafeId,
          payment_type: paymentType,
          serving_type: servingType,
          confirmed: 0,
          tableId: servingType === "serve" ? tableId : null,
          is_paid: paymentType === "cash" ? true : false,
        },
        { transaction: t }
      );

      // Create detailed transaction records
      const detailedTransactions = transactions.items.map(async (item) => {
        await DetailedTransaction.create(
          {
            transactionId: newTransaction.transactionId,
            itemId: item.itemId,
            qty: item.qty,
          },
          { transaction: t }
        );
      });

      await Promise.all(detailedTransactions);

      if (userEmail != "null") {
        if (!user) {
          const token = generateToken();
          await Session.create({ userId: userId, token }, { transaction: t });
          await sendEmail(userEmail, cafe, "invite", transactions.items, token);
        } else if (user.password === "unsetunsetunset") {
          // Send email to complete registration
          const token = generateToken();
          await Session.create({ userId: userId, token }, { transaction: t });
          await sendEmail(
            userEmail,
            cafe,
            "completeRegistration",
            transactions.items,
            token
          );
        }
      }
    });

    userHelper.sendMessageToAllClerk(cafeId, "transaction_created", {
      transactionId: newTransaction.transactionId,
    });

    res.status(201).json({ message: "Transactions created successfully" });
  } catch (error) {
    console.error("Error creating transactions:", error);
    res.status(500).json({ message: "Failed to create transactions" });
  }
};

exports.transactionFromGuestDevice = async (req, res) => {
  console.log("fromguestdevice");
  const tokenn = req.header("Authorization")?.replace("Bearer ", "");
  console.log("ini tokeennnnn");
  console.log(req.user);
  //userId is guest who transacte
  const token = generateToken();
  const { cafeId } = req.params;

  const cafe = await Cafe.findByPk(cafeId);
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });

  const { payment_type, serving_type, tableNo, transactions, socketId } =
    req.body;
  let paymentType = payment_type == "cash" ? "cash" : "cashless";
  let servingType = serving_type == "pickup" ? "pickup" : "serve";
  let tableId;
  console.log("bayar" + socketId);
  if (servingType == "serve") {
    const table = await Table.findOne({
      where: { cafeId: cafeId, tableNo: tableNo },
    });
    if (!table) return res.status(404).json({ error: "Table not found" });

    tableId = table.tableId;
  }

  let userId;
  if (!req.user) {
    // Create user with a default password
    const newUsername = await generateUniqueUsername();
    const newUser = await User.create({
      username: newUsername,
      password: "unsetunsetunset",
      roleId: 3,
    });
    userId = newUser.userId;

    //because new user hasnt logged on socket list with its own userId
    userHelper.logUnloggedUserSocket(userId, socketId);
  } else {
    userId = req.user.userId;
  }
  let newTransaction = null;
  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      newTransaction = await Transaction.create(
        {
          userId: userId,
          cafeId: cafeId,
          payment_type: paymentType,
          serving_type: servingType,
          confirmed: 0,
          tableId: servingType === "serve" ? tableId : null,
          is_paid: false,
        },
        { transaction: t }
      );

      // Create detailed transaction records
      const detailedTransactions = transactions.items.map(async (item) => {
        await DetailedTransaction.create(
          {
            transactionId: newTransaction.transactionId,
            itemId: item.itemId,
            qty: item.qty,
          },
          { transaction: t }
        );
      });

      await Promise.all(detailedTransactions);

      if (!req.user) {
        await Session.create({ userId: userId, token }, { transaction: t });
      }
    });
    socketId;
    userHelper.sendMessageToAllClerk(cafeId, "transaction_created", {
      transactionId: newTransaction.transactionId,
    });
    userHelper.sendMessageToSocket(
      socketId,
      "transaction_pending",
      newTransaction.transactionId
    );

    res.status(201).json({
      message: "Transactions created successfully",
      newUser: req.user == null,
      auth: token,
    });
  } catch (error) {
    console.error("Error creating transactions:", error);
    res.status(500).json({ message: "Failed to create transactions" });
  }
};

exports.confirmTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId);

    if (transaction.cafeId != req.user.cafeId)
      return res.status(401).json({ error: "Unauthorized" });

    if (transaction.payment_type == "cash") transaction.is_paid = true;
    // cashless transaction are waiting for guest to press "i have already paid", then the clerk press "is paid"

    transaction.confirmed = 1;
    await transaction.save();

    if (transaction.payment_type == "cash")
      userHelper.sendMessageToUser(transaction.userId, "transaction_success");
    else
      userHelper.sendMessageToUser(
        transaction.userId,
        "transaction_confirmed",
        {
          transactionId: transaction.transactionId,
        }
      );

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.declineTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId);
    if (transaction.cafeId != req.user.cafeId)
      return res.status(401).json({ error: "Unauthorized" });
    transaction.confirmed = -1;
    await transaction.save();

    userHelper.sendMessageToUser(transaction.userId, "transaction_failed", {
      transactionId: transaction.transactionId,
    });

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//for buyer (cashless)
exports.claimIsCashlessPaidTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId);

    if (transaction.userId != req.user.userId)
      return res.status(401).json({ error: "Unauthorized" });

    transaction.paymentClaimed = true;
    await transaction.save();

    userHelper.sendMessageToAllClerk(transaction.cafeId, "payment_claimed", {
      transactionId: transaction.transactionId,
    });

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//for clerk (cash or cashless)
exports.confirmIsCashlessPaidTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId);

    if (transaction.cafeId != req.user.cafeId)
      return res.status(401).json({ error: "Unauthorized" });

    if (transaction.payment_type == "cashless") transaction.is_paid = true;
    // cashless transaction are waiting for guest to press "i have already paid", then the clerk press "is paid"

    await transaction.save();

    userHelper.sendMessageToUser(transaction.userId, "transaction_success");

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    // Fetch the transaction, including related detailed transactions and items
    const transaction = await Transaction.findByPk(transactionId, {
      include: {
        model: DetailedTransaction,
        include: [Item], // Assuming DetailedTransaction has an association with Item
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Check if the user is authorized to view this transaction
    if (
      transaction.userId !== req.user.userId &&
      transaction.cafeId != req.user.cafeId
    ) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTransactions = async (req, res) => {
  const { cafeId } = req.params;
  const { demandLength } = req.query;

  if (req.user.cafeId != cafeId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Convert demandLength to integer and set limit
    const limit = parseInt(demandLength, 10);

    // Prepare the query options
    const queryOptions = {
      where: { cafeId: cafeId },
      order: [["createdAt", "DESC"]], // Sort by creation date
      include: [
        {
          model: DetailedTransaction,
          include: [Item], // Include associated Item model
        },
        {
          model: Table,
        },
      ],
    };

    // Apply the limit if it's not -1
    if (limit !== -1) {
      queryOptions.limit = limit;
    }

    // Retrieve transactions
    const transactions = await Transaction.findAll(queryOptions);

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTransactions = async (req, res) => {
  const { cafeId } = req.params;
  const { demandLength } = req.query;

  if (req.user.cafeId != cafeId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Convert demandLength to integer and set limit
    const limit = parseInt(demandLength, 10);

    // Prepare the query options
    const queryOptions = {
      where: { cafeId: cafeId },
      order: [["createdAt", "DESC"]], // Sort by creation date
      include: [
        {
          model: DetailedTransaction,
          include: [Item], // Include associated Item model
        },
        {
          model: Table,
        },
      ],
    };

    // Apply the limit if it's not -1
    if (limit !== -1) {
      queryOptions.limit = limit;
    }

    // Retrieve transactions
    const transactions = await Transaction.findAll(queryOptions);

    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.calculateIncome = async (req, res) => {
  const { cafeId } = req.params;

  try {
    const today = new Date();
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    // Fetch all transactions from the last 2 years
    const transactions = await Transaction.findAll({
      where: {
        cafeId: cafeId,

        createdAt: {
          [Op.between]: [twoYearsAgo, today],
        },
      },
      include: [
        {
          model: DetailedTransaction,
          include: [Item],
        },
      ],
    });

    // Helper function to calculate income for a given period
    const calculateIncome = (transactions, startDate, endDate) => {
      return transactions
        .filter((transaction) => {
          const date = new Date(transaction.createdAt);
          return date >= startDate && date <= endDate;
        })
        .reduce((totalIncome, transaction) => {
          const itemTotal = transaction.DetailedTransactions.reduce(
            (sum, detailedTransaction) => {
              return (
                sum + detailedTransaction.Item.price * detailedTransaction.qty
              );
            },
            0
          );
          return totalIncome + itemTotal;
        }, 0);
    };

    // Helper function to get the start of the week/month/year
    const getStartOfWeek = (date) => {
      const start = new Date(date);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when start of week is Sunday
      start.setDate(diff);
      return start;
    };

    const getStartOfMonth = (date) =>
      new Date(date.getFullYear(), date.getMonth(), 1);
    const getStartOfYear = (date) => new Date(date.getFullYear(), 0, 1);

    // Define date ranges for calculations
    const todayStart = new Date();
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(todayStart.getDate() - 1);

    const thisWeekStart = getStartOfWeek(new Date());
    const lastWeekStart = getStartOfWeek(new Date());
    lastWeekStart.setFullYear(lastWeekStart.getFullYear() - 1);

    const thisMonthStart = getStartOfMonth(new Date());
    const lastMonthStart = getStartOfMonth(new Date());
    lastMonthStart.setFullYear(lastMonthStart.getFullYear() - 1);

    const thisYearStart = getStartOfYear(new Date());
    const lastYearStart = getStartOfYear(new Date());
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);

    // Calculate incomes
    const dailyIncome = calculateIncome(transactions, todayStart, todayStart);
    const dailyIncomeYesterday = calculateIncome(
      transactions,
      yesterdayStart,
      yesterdayStart
    );

    const weeklyIncome = calculateIncome(
      transactions,
      thisWeekStart,
      new Date()
    );
    const weeklyIncomeLastYear = calculateIncome(
      transactions,
      lastWeekStart,
      new Date(
        lastWeekStart.getFullYear(),
        lastWeekStart.getMonth(),
        lastWeekStart.getDate() + 7
      )
    );

    const monthlyIncome = calculateIncome(
      transactions,
      thisMonthStart,
      new Date()
    );
    const monthlyIncomeLastYear = calculateIncome(
      transactions,
      lastMonthStart,
      new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 0)
    );

    const yearlyIncome = calculateIncome(
      transactions,
      thisYearStart,
      new Date()
    );
    const yearlyIncomeLastYear = calculateIncome(
      transactions,
      lastYearStart,
      new Date(lastYearStart.getFullYear() + 1, 0, 0)
    );

    // Calculate growth percentages
    const dailyIncomeGrowth = dailyIncomeYesterday
      ? ((dailyIncome - dailyIncomeYesterday) / dailyIncomeYesterday) * 100
      : 0;
    const weeklyIncomeGrowth = weeklyIncomeLastYear
      ? ((weeklyIncome - weeklyIncomeLastYear) / weeklyIncomeLastYear) * 100
      : 0;
    const monthlyIncomeGrowth = monthlyIncomeLastYear
      ? ((monthlyIncome - monthlyIncomeLastYear) / monthlyIncomeLastYear) * 100
      : 0;
    const yearlyIncomeGrowth = yearlyIncomeLastYear
      ? ((yearlyIncome - yearlyIncomeLastYear) / yearlyIncomeLastYear) * 100
      : 0;

    res.status(200).json({
      dailyIncome,
      weeklyIncome,
      monthlyIncome,
      yearlyIncome,
      dailyIncomeGrowth,
      weeklyIncomeGrowth,
      monthlyIncomeGrowth,
      yearlyIncomeGrowth,
    });
  } catch (error) {
    console.error("Error calculating income:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.getBestSellingItems = async (req, res) => {
  const { cafeId } = req.params;

  if (!cafeId) {
    return res.status(400).json({ error: "Cafe ID is required" });
  }

  try {
    // Helper function to get total count for a given time range
    const getTotalCountForItem = async (itemId, startDate, endDate) => {
      return await DetailedTransaction.count({
        include: [
          {
            model: Transaction,
            attributes: [],
            required: true,
            where: {
              cafeId: cafeId,
              createdAt: {
                [Op.between]: [startDate, endDate],
              },
            },
          },
        ],
        where: {
          itemId: itemId,
        },
      });
    };

    // Get today's date and calculate the ranges
    const today = moment().startOf("day");
    const startOfWeek = moment().startOf("week");
    const startOfMonth = moment().startOf("month");
    const startOfYear = moment().startOf("year");

    const endOfDay = today.clone().endOf("day");
    const endOfWeek = moment().endOf("week");
    const endOfMonth = moment().endOf("month");
    const endOfYear = moment().endOf("year");

    // Function to calculate percentage change
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / previous) * 100;
    };

    // Helper function to get stats for a given item ID
    const getItemStats = async (
      itemId,
      periodStart,
      periodEnd,
      prevPeriodStart,
      prevPeriodEnd
    ) => {
      const currentCount = await getTotalCountForItem(
        itemId,
        periodStart.toDate(),
        periodEnd.toDate()
      );
      const previousCount = await getTotalCountForItem(
        itemId,
        prevPeriodStart.toDate(),
        prevPeriodEnd.toDate()
      );
      return {
        itemId,
        sold: currentCount,
        percentageByPreviousPeriod: calculatePercentageChange(
          currentCount,
          previousCount
        ),
      };
    };

    // Get item stats for each period
    const dailyStats = [];
    const weeklyStats = [];
    const monthlyStats = [];
    const yearlyStats = [];

    // Get stats for today
    const dailyItems = await DetailedTransaction.findAll({
      attributes: ["itemId"],
      include: [
        {
          model: Item,
          attributes: ["itemId", "name"],
          required: true,
        },
        {
          model: Transaction,
          attributes: [],
          required: true,
          where: {
            cafeId: cafeId,
            createdAt: {
              [Op.between]: [today.toDate(), endOfDay.toDate()],
            },
          },
        },
      ],
      group: ["DetailedTransaction.itemId", "Item.itemId"],
      order: [[fn("COUNT", col("DetailedTransaction.itemId")), "DESC"]],
    });

    for (const item of dailyItems) {
      const itemId = item.itemId;
      const stats = await getItemStats(
        itemId,
        today,
        endOfDay,
        today.clone().subtract(1, "day").startOf("day"),
        today.clone().subtract(1, "day").endOf("day")
      );
      dailyStats.push({ ...item.toJSON(), ...stats });
    }

    // Get stats for this week
    const weeklyItems = await DetailedTransaction.findAll({
      attributes: ["itemId"],
      include: [
        {
          model: Item,
          attributes: ["itemId", "name"],
          required: true,
        },
        {
          model: Transaction,
          attributes: [],
          required: true,
          where: {
            cafeId: cafeId,
            createdAt: {
              [Op.between]: [startOfWeek.toDate(), endOfWeek.toDate()],
            },
          },
        },
      ],
      group: ["DetailedTransaction.itemId", "Item.itemId"],
      order: [[fn("COUNT", col("DetailedTransaction.itemId")), "DESC"]],
    });

    for (const item of weeklyItems) {
      const itemId = item.itemId;
      const stats = await getItemStats(
        itemId,
        startOfWeek,
        endOfWeek,
        startOfWeek.clone().subtract(1, "week"),
        endOfWeek.clone().subtract(1, "week")
      );
      weeklyStats.push({ ...item.toJSON(), ...stats });
    }

    // Get stats for this month
    const monthlyItems = await DetailedTransaction.findAll({
      attributes: ["itemId"],
      include: [
        {
          model: Item,
          attributes: ["itemId", "name"],
          required: true,
        },
        {
          model: Transaction,
          attributes: [],
          required: true,
          where: {
            cafeId: cafeId,
            createdAt: {
              [Op.between]: [startOfMonth.toDate(), endOfMonth.toDate()],
            },
          },
        },
      ],
      group: ["DetailedTransaction.itemId", "Item.itemId"],
      order: [[fn("COUNT", col("DetailedTransaction.itemId")), "DESC"]],
    });

    for (const item of monthlyItems) {
      const itemId = item.itemId;
      const stats = await getItemStats(
        itemId,
        startOfMonth,
        endOfMonth,
        startOfMonth.clone().subtract(1, "month"),
        endOfMonth.clone().subtract(1, "month")
      );
      monthlyStats.push({ ...item.toJSON(), ...stats });
    }

    // Get stats for this year
    const yearlyItems = await DetailedTransaction.findAll({
      attributes: ["itemId"],
      include: [
        {
          model: Item,
          attributes: ["itemId", "name"],
          required: true,
        },
        {
          model: Transaction,
          attributes: [],
          required: true,
          where: {
            cafeId: cafeId,
            createdAt: {
              [Op.between]: [startOfYear.toDate(), endOfYear.toDate()],
            },
          },
        },
      ],
      group: ["DetailedTransaction.itemId", "Item.itemId"],
      order: [[fn("COUNT", col("DetailedTransaction.itemId")), "DESC"]],
    });

    for (const item of yearlyItems) {
      const itemId = item.itemId;
      const stats = await getItemStats(
        itemId,
        startOfYear,
        endOfYear,
        startOfYear.clone().subtract(1, "year"),
        endOfYear.clone().subtract(1, "year")
      );
      yearlyStats.push({ ...item.toJSON(), ...stats });
    }

    // Send the response
    res.status(200).json({
      daily: dailyStats,
      weekly: weeklyStats,
      monthly: monthlyStats,
      yearly: yearlyStats,
    });
  } catch (error) {
    console.error("Error fetching best-selling items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.getTransactionTotalsWithPercentageChange = async (req, res) => {
  const { cafeId } = req.params;

  try {
    // Helper function to get total count for a given time range
    const getTotalCount = async (startDate, endDate) => {
      return await DetailedTransaction.count({
        include: [
          {
            model: Transaction,
            attributes: [], // We don't need additional attributes from Transaction
            required: true,
            where: {
              cafeId: cafeId,
              createdAt: {
                [Op.between]: [startDate, endDate],
              },
            },
          },
        ],
      });
    };

    // Get today's date and calculate the ranges
    const today = moment().startOf("day");
    const startOfWeek = moment().startOf("week");
    const startOfMonth = moment().startOf("month");
    const startOfYear = moment().startOf("year");

    const endOfDay = today.clone().endOf("day");
    const endOfWeek = moment().endOf("week");
    const endOfMonth = moment().endOf("month");
    const endOfYear = moment().endOf("year");

    // Get total counts for different periods
    const todayCount = await getTotalCount(today.toDate(), endOfDay.toDate());
    const weekCount = await getTotalCount(
      startOfWeek.toDate(),
      endOfWeek.toDate()
    );
    const monthCount = await getTotalCount(
      startOfMonth.toDate(),
      endOfMonth.toDate()
    );
    const yearCount = await getTotalCount(
      startOfYear.toDate(),
      endOfYear.toDate()
    );

    // Function to calculate percentage change
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return Math.round(((current - previous) / previous) * 100);
    };

    // Get previous period counts for comparison
    const previousDay = today.clone().subtract(1, "day");
    const previousWeekStart = startOfWeek.clone().subtract(1, "week");
    const previousWeekEnd = endOfWeek.clone().subtract(1, "week");
    const previousMonthStart = startOfMonth.clone().subtract(1, "month");
    const previousMonthEnd = endOfMonth.clone().subtract(1, "month");
    const previousYearStart = startOfYear.clone().subtract(1, "year");
    const previousYearEnd = endOfYear.clone().subtract(1, "year");

    const previousDayCount = await getTotalCount(
      previousDay.startOf("day").toDate(),
      previousDay.endOf("day").toDate()
    );
    const previousWeekCount = await getTotalCount(
      previousWeekStart.toDate(),
      previousWeekEnd.toDate()
    );
    const previousMonthCount = await getTotalCount(
      previousMonthStart.toDate(),
      previousMonthEnd.toDate()
    );
    const previousYearCount = await getTotalCount(
      previousYearStart.toDate(),
      previousYearEnd.toDate()
    );

    // Calculate percentage changes and round to integers
    const dayChange = calculatePercentageChange(todayCount, previousDayCount);
    const weekChange = calculatePercentageChange(weekCount, previousWeekCount);
    const monthChange = calculatePercentageChange(
      monthCount,
      previousMonthCount
    );
    const yearChange = calculatePercentageChange(yearCount, previousYearCount);

    // Respond with totals and percentage changes in the specified format
    res.status(200).json({
      daily: [todayCount, dayChange],
      weekly: [weekCount, weekChange],
      monthly: [monthCount, monthChange],
      yearly: [yearCount, yearChange],
    });
  } catch (error) {
    console.error("Error fetching transaction totals:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// exports.getTransactions = async (req, res) => {
//   const { cafeId } = req.params;
//   const { demandLength } = req.query;

//   if (req.user.cafeId != cafeId) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     // Convert demandLength to integer and set limit
//     const limit = parseInt(demandLength, 10);

//     // Prepare the query options
//     const queryOptions = {
//       where: { cafeId: cafeId },
//       order: [["createdAt", "DESC"]],
//       include: [
//         {
//           model: DetailedTransaction,
//           include: [
//             {
//               model: Item,
//               include: [ItemType],
//             },
//           ],
//         },
//         {
//           model: Table,
//         },
//       ],
//     };

//     // Apply the limit if it's not -1
//     if (limit !== -1) {
//       queryOptions.limit = limit;
//     }

//     // Retrieve transactions
//     const transactions = await Transaction.findAll(queryOptions);

//     // Initialize an array to store the final result
//     const result = [];

//     // Process transactions
//     transactions.forEach((transaction) => {
//       // Initialize a map to collect items by ItemType for the current transaction
//       const itemTypeMap = new Map();

//       transaction.DetailedTransactions.forEach((detailed) => {
//         if (detailed.Item && detailed.Item.ItemType) {
//           const itemType = detailed.Item.ItemType;

//           // Create an entry in the map if it doesn't exist
//           if (!itemTypeMap.has(itemType.itemTypeId)) {
//             itemTypeMap.set(itemType.itemTypeId, {
//               itemTypeId: itemType.itemTypeId,
//               cafeId: itemType.cafeId,
//               typeName: itemType.name,
//               itemList: [],
//             });
//           }

//           // Add item to the correct itemType entry
//           itemTypeMap.get(itemType.itemTypeId).itemList.push({
//             itemId: detailed.itemId,
//             price: detailed.Item.price,
//             name: detailed.Item.name,
//             image: detailed.Item.image,
//             qty: detailed.qty,
//           });
//         }
//       });

//       // Convert the map values to an array
//       const itemTypeList = Array.from(itemTypeMap.values());

//       // Add transaction details along with itemTypeList to the result
//       result.push({
//         transactionId: transaction.transactionId,
//         userId: transaction.userId,
//         user_email: transaction.user_email,
//         clerkId: transaction.clerkId,
//         tableId: transaction.tableId,
//         cafeId: transaction.cafeId,
//         payment_type: transaction.payment_type,
//         serving_type: transaction.serving_type,
//         is_paid: transaction.is_paid,
//         confirmed: transaction.confirmed,
//         createdAt: transaction.createdAt,
//         updatedAt: transaction.updatedAt,
//         Table: transaction.Table,
//         itemTypes: itemTypeList,
//       });
//     });

//     res.status(200).json(result);
//   } catch (error) {
//     console.error("Error fetching transactions:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };

// Controller to update a user
exports.endCashTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction || transaction.payment_type != "cash")
      return res.status(403);

    transaction.is_paid = true;
    await transaction.save();

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// exports.createReportForAllCafes = async () => {
//   console.log("Starting report generation for all cafes...");
//   try {
//     // Fetch all cafes
//     const cafes = await Cafe.findAll();

//     // Create a report for each cafe
//     for (const cafe of cafes) {
//       try {
//         await generateDailyReport(cafe.cafeId);
//         console.log(`Report generated for cafeId: ${cafe.cafeId}`);
//       } catch (err) {
//         console.error(
//           `Failed to generate report for cafeId: ${cafe.cafeId}`,
//           err
//         );
//       }
//     }
//   } catch (error) {
//     console.error("Error creating reports for all cafes:", error);
//   }
// };

const getStartOfDay = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to the start of the day
  return now;
};
const generateDailyReport = async (cafeId) => {
  const now = new Date();
  const startOfDay = getStartOfDay();

  try {
    // Find the favoriteItemId by most frequent itemId
    const favoriteItem = await DetailedTransaction.findOne({
      attributes: [
        "itemId",
        [sequelize.fn("COUNT", sequelize.col("itemId")), "count"],
      ],
      where: {
        createdAt: {
          [Op.between]: [startOfDay, now],
        },
      },
      group: ["itemId"],
      order: [[sequelize.fn("COUNT", sequelize.col("itemId")), "DESC"]],
      limit: 1,
    });

    const favoriteItemId = favoriteItem ? favoriteItem.itemId : null;
    const totalIncomeResult = await sequelize.query(
      `
      SELECT SUM(dt."qty" * i."price") AS totalIncome
      FROM "DetailedTransaction" dt
      JOIN "Item" i ON dt."itemId" = i."itemId"
      WHERE dt."createdAt" BETWEEN :startOfDay AND :now
        AND i."cafeId" = :cafeId
      `,
      {
        replacements: { startOfDay, now, cafeId },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    const totalIncome = totalIncomeResult[0].totalIncome || 0;

    // Count the transactionCount
    const transactionCount = await Transaction.count({
      where: {
        cafeId,
        createdAt: {
          [Op.between]: [startOfDay, now],
        },
      },
    });

    // Find all MaterialMutation between the last 24 hours
    const materialMutations = await MaterialMutation.findAll({
      include: [
        {
          model: Material,
          attributes: [], // No need to include Material fields in the result
          where: { cafeId }, // Filter by cafeId in the Material table
        },
      ],
      where: {
        changeDate: {
          [Op.between]: [startOfDay, now],
        },
      },
    });

    // Create a new daily report
    const newReport = await DailyReport.create({
      cafeId,
      reportDate: now,
      favoriteItemId,
      totalIncome,
      transactionCount,
      materialMutationIds: materialMutations.map((m) => m.mutationId).join(","), // Join materialMutationIds with a comma
    });

    return newReport;
  } catch (error) {
    console.error("Error creating report:", error);
    throw new Error("Internal server error");
  }
};

exports.getReport = async (req, res) => {
  const { cafeId } = req.params;
  const { type } = req.query; // "daily", "weekly", "monthly", "yearly"
  let filter = type;
  if (!["daily", "weekly", "monthly", "yearly"].includes(filter)) {
    return res.status(400).json({ error: "Invalid filter type" });
  }

  const today = moment().startOf("day");
  let currentStartDate, currentEndDate, previousStartDate, previousEndDate;

  switch (filter) {
    case "daily":
      currentStartDate = today.clone().subtract(1, "days").startOf("day"); // yesterday
      currentEndDate = today.clone().subtract(1, "days").endOf("day");
      previousStartDate = today.clone().subtract(2, "days").startOf("day"); // day before yesterday
      previousEndDate = today.clone().subtract(2, "days").endOf("day");
      break;
    case "weekly":
      currentStartDate = today.clone().startOf("week").subtract(1, "week");
      currentEndDate = today.clone().endOf("week").subtract(1, "week");
      previousStartDate = today.clone().startOf("week").subtract(2, "week");
      previousEndDate = today.clone().endOf("week").subtract(2, "week");
      break;
    case "monthly":
      currentStartDate = today.clone().startOf("month").subtract(1, "month");
      currentEndDate = today.clone().endOf("month").subtract(1, "month");
      previousStartDate = today.clone().startOf("month").subtract(2, "month");
      previousEndDate = today.clone().endOf("month").subtract(2, "month");
      break;
    case "yearly":
      currentStartDate = today.clone().startOf("year").subtract(1, "year");
      currentEndDate = today.clone().endOf("year").subtract(1, "year");
      previousStartDate = today.clone().startOf("year").subtract(2, "year");
      previousEndDate = today.clone().endOf("year").subtract(2, "year");
      break;
  }

  try {
    // Fetch data for both the current and previous periods
    const reports = await DailyReport.findAll({
      where: {
        cafeId,
        reportDate: {
          [Op.between]: [
            previousStartDate.format("YYYY-MM-DD"),
            currentEndDate.format("YYYY-MM-DD"),
          ],
        },
      },
      attributes: [
        "reportDate",
        "favoriteItemId",
        [sequelize.fn("SUM", sequelize.col("totalIncome")), "totalIncome"],
        [
          sequelize.fn("SUM", sequelize.col("transactionCount")),
          "transactionCount",
        ],
      ],
      group: ["reportDate", "favoriteItemId"],
    });

    // Initialize data structures for current and previous periods
    const currentData = {
      totalIncome: 0,
      transactionCount: 0,
      favoriteItems: {},
    };
    const previousData = {
      totalIncome: 0,
      transactionCount: 0,
      favoriteItems: {},
    };

    reports.forEach((report) => {
      const reportDate = moment(report.reportDate);
      if (reportDate.isBetween(currentStartDate, currentEndDate, null, "[]")) {
        currentData.totalIncome += parseFloat(report.totalIncome);
        currentData.transactionCount += parseInt(report.transactionCount);
        currentData.favoriteItems[report.favoriteItemId] =
          (currentData.favoriteItems[report.favoriteItemId] || 0) + 1;
      } else if (
        reportDate.isBetween(previousStartDate, previousEndDate, null, "[]")
      ) {
        previousData.totalIncome += parseFloat(report.totalIncome);
        previousData.transactionCount += parseInt(report.transactionCount);
        previousData.favoriteItems[report.favoriteItemId] =
          (previousData.favoriteItems[report.favoriteItemId] || 0) + 1;
      }
    });

    // Compute favorite item for current and previous periods
    const currentFavoriteItemId = Object.keys(currentData.favoriteItems).reduce(
      (a, b) =>
        currentData.favoriteItems[a] > currentData.favoriteItems[b] ? a : b,
      null
    );
    const previousFavoriteItemId = Object.keys(
      previousData.favoriteItems
    ).reduce(
      (a, b) =>
        previousData.favoriteItems[a] > previousData.favoriteItems[b] ? a : b,
      null
    );

    // Calculate growth
    const incomeGrowth =
      previousData.totalIncome > 0
        ? ((currentData.totalIncome - previousData.totalIncome) /
            previousData.totalIncome) *
          100
        : currentData.totalIncome > 0
        ? 100
        : 0;

    const transactionGrowth =
      previousData.transactionCount > 0
        ? ((currentData.transactionCount - previousData.transactionCount) /
            previousData.transactionCount) *
          100
        : currentData.transactionCount > 0
        ? 100
        : 0;

    return res.json({
      totalIncome: currentData.totalIncome,
      transactionCount: currentData.transactionCount,
      favoriteItemId: currentFavoriteItemId,
      incomeGrowth,
      transactionGrowth,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ error: "An error occurred while retrieving the report" });
  }
};

// const getDateRange = (type) => {
//   const now = new Date();
//   let startDate, endDate, previousStartDate, previousEndDate;

//   switch (type) {
//     case "daily":
//       startDate = new Date(now.setHours(0, 0, 0, 0));
//       endDate = new Date(startDate).setDate(startDate.getDate() + 1);
//       previousStartDate = new Date(startDate).setDate(startDate.getDate() - 1);
//       previousEndDate = new Date(startDate);
//       break;
//     case "weekly":
//       const startOfWeek = now.getDate() - now.getDay(); // Adjust according to your start day of the week
//       startDate = new Date(now.setDate(startOfWeek));
//       endDate = new Date(startDate).setDate(startDate.getDate() + 7);
//       previousStartDate = new Date(startDate).setDate(startDate.getDate() - 7);
//       previousEndDate = new Date(startDate);
//       break;
//     case "monthly":
//       startDate = new Date(now.getFullYear(), now.getMonth(), 1);
//       endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
//       previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
//       previousEndDate = new Date(now.getFullYear(), now.getMonth(), 1);
//       break;
//     case "yearly":
//       startDate = new Date(now.getFullYear(), 0, 1);
//       endDate = new Date(now.getFullYear() + 1, 0, 1);
//       previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
//       previousEndDate = new Date(now.getFullYear(), 0, 1);
//       break;
//     default:
//       throw new Error("Invalid report type");
//   }

//   return {
//     current: { startDate, endDate },
//     previous: { startDate: previousStartDate, endDate: previousEndDate },
//   };
// };

// const generateReportWithGrowth = async (cafeId, type) => {
//   const { current, previous } = getDateRange(type);

//   try {
//     // Helper function to get the most favorite item ID for a given date range
//     const getFavoriteItemId = async (startDate, endDate) => {
//       const report = await DailyReport.findOne({
//         attributes: [
//           [fn("SUM", col("totalIncome")), "totalIncome"],
//           "favoriteItemId",
//         ],
//         where: {
//           reportDate: {
//             [Op.between]: [startDate, endDate],
//           },
//           ...(cafeId ? { cafeId } : {}),
//         },
//         group: ["favoriteItemId"],
//         order: [[fn("SUM", col("totalIncome")), "DESC"]],
//         raw: true,
//       });

//       return report ? report.favoriteItemId : null;
//     };

//     // Fetch current period total income and favorite item
//     const currentFavoriteItemId = await getFavoriteItemId(
//       current.startDate,
//       current.endDate
//     );
//     const currentIncomeResult = await DailyReport.findOne({
//       attributes: [[fn("SUM", col("totalIncome")), "totalIncome"]],
//       where: {
//         reportDate: {
//           [Op.between]: [current.startDate, current.endDate],
//         },
//         ...(cafeId ? { cafeId } : {}),
//       },
//       raw: true,
//     });

//     const currentTotalIncome = currentIncomeResult
//       ? currentIncomeResult.totalIncome
//       : 0;

//     // Fetch previous period total income and favorite item
//     const previousFavoriteItemId = await getFavoriteItemId(
//       previous.startDate,
//       previous.endDate
//     );
//     const previousIncomeResult = await DailyReport.findOne({
//       attributes: [[fn("SUM", col("totalIncome")), "totalIncome"]],
//       where: {
//         reportDate: {
//           [Op.between]: [previous.startDate, previous.endDate],
//         },
//         ...(cafeId ? { cafeId } : {}),
//       },
//       raw: true,
//     });

//     const previousTotalIncome = previousIncomeResult
//       ? previousIncomeResult.totalIncome
//       : 0;

//     // Fetch favorite item details
//     const currentFavoriteItem = currentFavoriteItemId
//       ? await Item.findByPk(currentFavoriteItemId)
//       : null;
//     const previousFavoriteItem = previousFavoriteItemId
//       ? await Item.findByPk(previousFavoriteItemId)
//       : null;

//     // Calculate growth percentage
//     const growthPercentage =
//       previousTotalIncome === 0
//         ? currentTotalIncome > 0
//           ? 100
//           : 0
//         : ((currentTotalIncome - previousTotalIncome) / previousTotalIncome) *
//           100;

//     return {
//       currentTotalIncome,
//       previousTotalIncome,
//       growthPercentage,
//       currentFavoriteItem: currentFavoriteItem
//         ? {
//             itemId: currentFavoriteItem.itemId,
//             itemName: currentFavoriteItem.name,
//             sold: currentTotalIncome,
//           }
//         : null,
//       previousFavoriteItem: previousFavoriteItem
//         ? {
//             itemId: previousFavoriteItem.itemId,
//             itemName: previousFavoriteItem.name,
//             sold: previousTotalIncome,
//           }
//         : null,
//     };
//   } catch (error) {
//     console.error("Error generating report with growth:", error);
//     throw new Error("Internal server error");
//   }
// };

// exports.getReport = async (req, res) => {
//   const { type } = req.query; // type can be 'daily', 'weekly', 'monthly', 'yearly'
//   const { cafeId } = req.params; // cafeId is expected as a query parameter

//   if (!["daily", "weekly", "monthly", "yearly"].includes(type)) {
//     return res.status(400).json({ error: "Invalid report type" });
//   }

//   try {
//     const reportData = await generateReportWithGrowth(cafeId || null, type);
//     res.status(200).json(reportData);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };
