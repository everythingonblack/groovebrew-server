const {
  User,
  Cafe,
  Session,
  Transaction,
  DetailedTransaction,
  ItemType,
  Item,
  Table,
  sequelize,
} = require("../models");
const { Op, fn, col } = require("sequelize");

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

  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      const newTransaction = await Transaction.create(
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

    userHelper.sendMessageToAllClerk(cafeId, "transaction_created");

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

  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      const newTransaction = await Transaction.create(
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
    userHelper.sendMessageToAllClerk(cafeId, "transaction_created");
    userHelper.sendMessageToSocket(socketId, "transaction_pending");

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

exports.paymentClaimed = async (req, res) => {
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
    if (transaction.userId !== req.user.userId) {
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

exports.createReport = async (req, res) => {
  const { cafeId } = req.body;

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
