const {
  User,
  Cafe,
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
const { generateToken } = require("../services/jwtHelper"); // Import the JWT helper

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
exports.transactionFromClerk = async (req, res) => {
  console.log("fromclerk");
  const { cafeId } = req.params;
  console.log(req.user)
  if (req.user.cafeId != cafeId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { user_email, payment_type, serving_type, tableNo, transactions } =
    req.body;

  let userEmail = user_email || "null";
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
  let user = null;
  if (userEmail != 'null') {
    user = await User.findOne({ where: { email: user_email } });
    if (!user) {
      // Create user with a default password
      const newUsername = await generateUniqueUsername();
      user = await User.create({
        email: userEmail,
        username: newUsername,
        password: "unsetunsetunset",
        roleId: 3,
      });
    }
  }

  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      const newTransaction = await Transaction.create(
        {
          clerkId: req.user.userId,
          userId: user?.userId,
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
        if (user.password === "unsetunsetunset") {
          // Send email to complete registration
          const token = generateToken(user);
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

  let userEmail = user_email || "null";
  if (userEmail != "null" && !isValidEmail(userEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  let user = null;

  if (userEmail != 'null') {

    user = await User.findOne({ where: { email: user_email } });
    if (!user) {
      // Create user with a default password
      const newUsername = await generateUniqueUsername();
      user = await User.create({
        email: userEmail,
        username: newUsername,
        password: "unsetunsetunset",
        roleId: 3,
      });
    }
  }

  let newTransaction = null;
  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      newTransaction = await Transaction.create(
        {
          clerkId: clerkOf.userId,
          userId: user?.userId,
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
        if (user.password === "unsetunsetunset") {
          // Send email to complete registration
          const token = generateToken(user);
          await sendEmail(
            userEmail,
            cafe,
            "completeRegistration",
            transactions.items,
            token
          );
        }
        else {
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
  let token = "";
  const { cafeId } = req.params;

  const cafe = await Cafe.findByPk(cafeId);
  if (!cafe) return res.status(404).json({ error: "Cafe not found" });

  const { payment_type, serving_type, tableNo, notes, transactions, socketId } =
    req.body;
  let paymentType = payment_type == "cash" ? "cash" : "cashless";
  let servingType = serving_type == "pickup" ? "pickup" : "serve";
  let tableId;

  if (servingType == "serve") {
    const table = await Table.findOne({
      where: { cafeId: cafeId, tableNo: tableNo },
    });
    if (!table) return res.status(404).json({ error: "Table not found" });

    tableId = table.tableId;
  }

  let user = { userId: 0 };
  if (!req.user) {
    // Create user with a default password
    const newUsername = await generateUniqueUsername();
    user = await User.create({
      username: newUsername,
      password: "unsetunsetunset",
      roleId: 3,
    });

    //because new user hasnt logged on socket list with its own userId
    userHelper.logUnloggedUserSocket(user.userId, socketId);
  } else {
    user.userId = req.user.userId;
  }
  let newTransaction = null;
  try {
    await sequelize.transaction(async (t) => {
      // Create the main transaction record
      newTransaction = await Transaction.create(
        {
          userId: user.userId,
          cafeId: cafeId,
          payment_type: paymentType,
          serving_type: servingType,
          confirmed: cafe.needsConfirmation ? 0 : 1,
          tableId: servingType === "serve" ? tableId : null,
          is_paid: false,
          notes: notes != null && notes,
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
        token = generateToken(user)
      }
    });

    userHelper.sendMessageToAllClerk(cafeId, "transaction_created", {
      cafeId: newTransaction.cafeId,
      transactionId: newTransaction.transactionId,
    });
    const event = cafe.needsConfirmation
      ? "transaction_pending"
      : "transaction_confirmed";
    res.status(201).json({
      message: "Transactions created successfully",
      newUser: req.user == null,
      auth: token,
    });
    userHelper.sendMessageToSocket(socketId, event, {
      transactionId: newTransaction.transactionId,
    });

  } catch (error) {
    console.error("Error creating transactions:", error);
    res.status(500).json({ message: "Failed to create transactions" });
  }
};

exports.confirmTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {

    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Cafe,
          attributes: ['ownerId'], // Only include the ownerId from the Cafe model
        },
      ],
    });
    if (transaction.confirmed == 3) return;

    if (transaction.cafeId != req.user.cafeId && transaction.Cafe.dataValues.ownerId != req.user.userId)
      return res.status(401).json({ error: "Unauthorized" });

    if (transaction.confirmed == 1) transaction.is_paid = true;
    // cashless transaction are waiting for guest to press "i have already paid", then the clerk press "is paid"

    //confirmed -1 = declined
    //confirmed 0 = undecided
    //confirmed 1 = available
    //confirmed 2 = ispaid -> item being processed
    //confirmed 3 = item ready
    transaction.confirmed = transaction.confirmed + 1;

    // Determine the event based on the updated confirmed value
    let event;
    if (transaction.confirmed === 1) {
      event = "transaction_confirmed"; // Write 'transaction_success' if the confirmed value is 2
    } else if (transaction.confirmed === 2) {
      event = "transaction_success"; // Write 'transaction_success' if the confirmed value is 2
    } else if (transaction.confirmed === 3) {
      event = "transaction_end"; // Write 'transaction_end' if the confirmed value is 3
      const payload = JSON.stringify({
        title: "Your item is ready",
        body: transaction.serving_type === "serve" ? "Please wait a moment." : "Come and pick up your item.",
        transactionId: transaction.transactionId, // Include your transaction ID here
      });

      userHelper.sendNotifToUserId(transaction.userId, payload);
    }

    await transaction.save();

    userHelper.sendMessageToUser(transaction.userId, event, {
      transactionId: transaction.transactionId,
    });

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.cancelTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId);
    console.log(transaction);
    if (transaction.userId != req.user.userId)
      return res.status(401).json({ error: "Unauthorized" });
    transaction.confirmed = -2;
    await transaction.save();

    userHelper.sendMessageToAllClerk(
      transaction.cafeId,
      "transaction_canceled",
      {
        transactionId: transaction.transactionId,
      }
    );
    userHelper.sendMessageToUser(transaction.userId, "transaction_canceled", {
      transactionId: transaction.transactionId,
    });

    res.status(200).json(transaction);
  } catch (error) {
    console.error("Error updating table:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.declineTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: DetailedTransaction,
          include: {
            model: Item,
          },
        },
        {
          model: Cafe,
          attributes: ['ownerId'], // Only include the ownerId from the Cafe model
        },
      ],
    });


    if (transaction.cafeId != req.user.cafeId && transaction.Cafe.dataValues.ownerId != req.user.userId)
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
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: Cafe,
          attributes: ['ownerId'], // Only include the ownerId from the Cafe model
        },
      ],
    });


    if (transaction.cafeId != req.user.cafeId && transaction.Cafe.dataValues.ownerId != req.user.userId)
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

exports.getMyTransactions = async (req, res) => {
  try {
    // Fetch the transaction, including related detailed transactions, items, and cafes
    const transactions = await Transaction.findAll({
      include: [
        {
          model: DetailedTransaction,
          include: [Item], // Assuming DetailedTransaction has an association with Item
        },
        {
          model: Cafe, // Assuming Transaction has an association with Cafe
        },
      ],
      where: { userId: req.user.userId },
      order: [["createdAt", "DESC"]],
    });

    // Group transactions by cafeId
    const groupedTransactions = transactions.reduce((result, transaction) => {
      const cafeId = transaction.Cafe.cafeId; // Assuming `Cafe` is an associated model
      if (!result[cafeId]) {
        result[cafeId] = {
          cafeId: cafeId,
          name: transaction.Cafe.name,
          transactions: [],
        };
      }

      result[cafeId].transactions.push({
        transactionId: transaction.transactionId,
        detailedTransactions: transaction.DetailedTransactions, // Assuming DetailedTransactions is the association name
      });

      return result;
    }, {});

    // Now convert the grouped transactions object to an array (or leave it as an object if you prefer)
    const groupedArray = Object.values(groupedTransactions);

    // Send the grouped response
    res.status(200).json(groupedArray);

  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getTransaction = async (req, res) => {
  const { transactionId } = req.params;

  try {
    // Fetch the transaction, including related detailed transactions and items
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: DetailedTransaction,
          include: [Item], // Assuming DetailedTransaction has an association with Item
        },
        {
          model: Cafe,
          attributes: ['ownerId'], // Only include the ownerId from the Cafe model
        },
      ],
    });


    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    console.log(transaction)
    // Check if the user is authorized to view this transaction
    if (
      transaction.userId !== req.user.userId &&
      transaction.cafeId != req.user.cafeId && transaction.Cafe.dataValues.ownerId != req.user.userId
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

  try {
    // Convert demandLength to integer and set limit
    const limit = parseInt(demandLength, 10);
    const cafe = await Cafe.findByPk(cafeId);
    // Prepare the base query options
    const queryOptions = {
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

    // Determine the where clause
    if (req.user.cafeId !== cafeId && req.user.userId != cafe.ownerId) {
      queryOptions.where = {
        cafeId: cafeId,
        userId: req.user.userId // Add userId filter if cafeId does not match
      };
    } else {
      queryOptions.where = { cafeId: cafeId }; // Use cafeId filter
    }

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

exports.createReportForAllCafes = async () => {
  console.log("Starting report generation for all cafes...");
  try {
    // Fetch all cafes
    const cafes = await Cafe.findAll();

    // Create a report for each cafe
    for (const cafe of cafes) {
      try {
        await generateDailyReport(cafe.cafeId);
        console.log(`Report generated for cafeId: ${cafe.cafeId}`);
      } catch (err) {
        console.error(
          `Failed to generate report for cafeId: ${cafe.cafeId}`,
          err
        );
      }
    }
  } catch (error) {
    console.error("Error creating reports for all cafes:", error);
  }
};

const getStartOfDayMinus24Hours = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0); // Sets to start of the current day (12:00 AM)
  date.setDate(date.getDate() - 1); // Moves back by one day
  return date;
};

const generateDailyReport = async (cafeId) => {
  const now = new Date();
  const startOfDay = getStartOfDayMinus24Hours(); // Midnight of the previous day

  // Find all detailed transactions for the specified cafe within the last day
  const detailedTransactions = await DetailedTransaction.findAll({
    where: {
      createdAt: {
        [Op.between]: [startOfDay, now],
      },
      '$Transaction.cafeId$': cafeId, // Join on cafeId
    },
    include: [{
      model: Transaction,
      attributes: [], // We don't need any attributes from Transaction
    }, {
      model: Item, // Assuming you have an Item model to get item price
      attributes: ['itemId', 'price'], // Include itemId and price
    }],
  });

  const materialMutations = await MaterialMutation.findAll({
    include: [
      {
        model: Material,
        where: { cafeId },
        attributes: [],
      },
    ],
    where: {
      newStock: { [Op.gt]: sequelize.col("oldStock") },
      createdAt: {
        [Op.between]: [startOfDay, now]
      },
    },
  });

  // Organize data for the report
  const reportData = {};

  detailedTransactions.forEach(detailedTransaction => {
    const transactionId = detailedTransaction.transactionId;
    const itemId = detailedTransaction.itemId;
    const sold = detailedTransaction.qty;
    const price = detailedTransaction.Item.price; // Get item price

    // Initialize the transaction entry if it doesn't exist
    if (!reportData[transactionId]) {
      reportData[transactionId] = [];
    }

    // Find if the item already exists in the array for this transaction
    const existingItem = reportData[transactionId].find(item => item.itemId === itemId);
    if (existingItem) {
      existingItem.sold += sold; // Update sold count
    } else {
      reportData[transactionId].push({ itemId, sold, price }); // Add new item with price
    }
  });

  // Convert reportData to the desired format
  const formattedReportData = Object.entries(reportData).map(([transactionId, itemsSold]) => ({
    transactionId: parseInt(transactionId, 10),
    itemsSold,
  }));

  // Prepare materialsPurchased from materialMutations
  const materialsPurchased = materialMutations.map(mutation => ({
    mutationId: mutation.dataValues.mutationId,
    priceAtp: mutation.dataValues.priceAtp,
    stockDifference: mutation.dataValues.newStock - mutation.dataValues.oldStock
  }));

  // Save the report to DailyReport
  await DailyReport.create({
    reportDate: startOfDay,
    cafeId,
    itemsSold: formattedReportData,
    materialsPurchased, // Add materialsPurchased here
  });

  console.log(`Daily report generated for ${startOfDay} for cafe ${cafeId}`);
};

async function getReportt(cafeId, filter, getAll = true) {
  const today = moment(); // Get current date

  let currentStartDate, currentEndDate, previousStartDate, previousEndDate;
  let currentTotalTransactions, growthIncome, growthTransactions, growthOutcome, finalItems = null;
  let currentTotalOutcome = 0;
  let allMaterialsPurchased = [];

  switch (filter) {
    case "daily":
      currentStartDate = today.clone().subtract(1, "days").startOf("day");
      currentEndDate = today.clone().subtract(1, "days").endOf("day");
      previousStartDate = today.clone().subtract(2, "days").startOf("day");
      previousEndDate = today.clone().subtract(2, "days").endOf("day");
      break;

    case "weekly":
      currentStartDate = today.clone().subtract(7, "days").startOf("day");
      currentEndDate = today.clone().subtract(1, "days").endOf("day");
      previousStartDate = today.clone().subtract(14, "days").startOf("day");
      previousEndDate = today.clone().subtract(8, "days").endOf("day");
      break;

    case "monthly":
      currentStartDate = today.clone().subtract(30, "days").startOf("day");
      currentEndDate = today.clone().subtract(1, "days").endOf("day");
      previousStartDate = today.clone().subtract(60, "days").startOf("day");
      previousEndDate = today.clone().subtract(31, "days").endOf("day");
      break;

    case "yearly":
      currentStartDate = today.clone().subtract(365, "days").startOf("day");
      currentEndDate = today.clone().subtract(1, "days").endOf("day");
      previousStartDate = today.clone().subtract(730, "days").startOf("day");
      previousEndDate = today.clone().subtract(366, "days").endOf("day");
      break;

    default:
      throw new Error("Invalid filter");
  }

  // Fetch current report data
  const currentReports = await DailyReport.findAll({
    where: {
      reportDate: {
        [Op.between]: [currentStartDate.format("YYYY-MM-DD"), currentEndDate.format("YYYY-MM-DD")],
      },
      cafeId
    },
  });

  // Fetch previous report data
  const previousReports = await DailyReport.findAll({
    where: {
      reportDate: {
        [Op.between]: [previousStartDate.format("YYYY-MM-DD"), previousEndDate.format("YYYY-MM-DD")],
      },
      cafeId
    },
  });

  // Calculate totals and growths
  const currentTotalIncome = currentReports.reduce((acc, report) => {
    const transactions = report.itemsSold;
    transactions.forEach(transaction => {
      transaction.itemsSold.forEach(item => {
        acc += item.price * item.sold; // Assuming price is per item
      });
    });
    return acc;
  }, 0);

  if (getAll == true) {
    // Calculate total transactions as the sum of all transactions across reports
    currentTotalTransactions = currentReports.reduce((acc, report) => {
      return acc + report.itemsSold.length; // Count each transaction
    }, 0);

    const previousTotalIncome = previousReports.reduce((acc, report) => {
      const transactions = report.itemsSold;
      transactions.forEach(transaction => {
        transaction.itemsSold.forEach(item => {
          acc += item.price * item.sold;
        });
      });
      return acc;
    }, 0);

    // Calculate previous total transactions
    const previousTotalTransactions = previousReports.reduce((acc, report) => {
      return acc + report.itemsSold.length; // Count each transaction
    }, 0);

    // Calculate growth percentages
    growthIncome = previousTotalIncome ? ((currentTotalIncome - previousTotalIncome) / previousTotalIncome) * 100 : 100;
    growthTransactions = previousTotalTransactions ? ((currentTotalTransactions - previousTotalTransactions) / previousTotalTransactions) * 100 : 100;

    const mutationIds = currentReports.flatMap(report =>
      (report.materialsPurchased || []).map(material => material.mutationId)
    );

    // Step 2: Fetch material mutations based on mutationId and include Material for name
    const currentMaterialMutations = await MaterialMutation.findAll({
      where: {
        mutationId: {
          [Op.in]: mutationIds, // Use Op.in to match mutationIds
        },
      },
      include: [
        {
          model: Material,
          required: true, // Enforces an INNER JOIN
          attributes: ['name'], // Fetch only the 'name' of the material
        },
      ],
      attributes: ['mutationId', 'materialId', 'createdAt'], // Fetch mutationId, materialId, and createdAt from MaterialMutation
    });

    console.log(currentMaterialMutations);

    // Step 3: Create a map from mutationId to material name and createdAt (date)
    const materialNameMap = currentMaterialMutations.reduce((acc, materialMutation) => {
      // Ensure that the object for the mutationId exists before setting values
      if (!acc[materialMutation.mutationId]) {
        acc[materialMutation.mutationId] = {};
      }

      // Assign the name and date (createdAt) to the respective mutationId
      acc[materialMutation.mutationId].materialId = materialMutation.materialId;
      acc[materialMutation.mutationId].name = materialMutation.Material.name;
      acc[materialMutation.mutationId].date = materialMutation.createdAt;

      return acc;
    }, {});

    console.log(materialNameMap);

    // Step 4: Loop through reports and add name and date from the map to allMaterialsPurchased
    currentReports.forEach(report => {
      const materials = report.materialsPurchased || []; // Handle if materialsPurchased is undefined
      materials.forEach(material => {
        currentTotalOutcome += material.stockDifference * material.priceAtp; // Sum priceAtp for current outcome
        allMaterialsPurchased.push({
          mutationId: material.mutationId, // Add mutationId
          materialId: materialNameMap[material.mutationId]?.materialId,
          date: materialNameMap[material.mutationId]?.date || 'Unknown', // Add date from the map (or 'Unknown' if not found)
          name: materialNameMap[material.mutationId]?.name || 'Unknown', // Add material name (or 'Unknown' if not found)
          priceAtp: material.priceAtp,
          stockDifference: material.stockDifference
        });
      });
    });

    // Calculate previous total outcome
    const previousTotalOutcome = previousReports.reduce((acc, report) => {
      const materials = report.materialsPurchased || [];
      materials.forEach(material => {
        acc += material.priceAtp;
      });
      return acc;
    }, 0);

    // Calculate growth outcome percentages
    growthOutcome = previousTotalOutcome ? ((currentTotalOutcome - previousTotalOutcome) / previousTotalOutcome) * 100 : 100;

    const items = currentReports.flatMap(report =>
      report.itemsSold.flatMap(transaction =>
        transaction.itemsSold.map(item => ({ itemId: item.itemId, sold: item.sold }))
      )
    );

    // Group items by itemId and sum the sold quantities
    const groupedItems = items.reduce((acc, item) => {
      const existingItem = acc.find(i => i.itemId === item.itemId);
      if (existingItem) {
        existingItem.sold += item.sold; // Sum the sold quantities
      } else {
        acc.push({ itemId: item.itemId, sold: item.sold }); // Add new item
      }
      return acc;
    }, []);

    // Sort the items by sold quantity in descending order
    groupedItems.sort((a, b) => b.sold - a.sold);

    // Fetch item names for all grouped items
    const itemIds = groupedItems.map(item => item.itemId);
    const itemsWithNames = await Item.findAll({
      where: {
        itemId: {
          [Op.in]: itemIds,
        },
      },
      attributes: ['itemId', 'name'] // Only fetch itemId and name
    });

    // Create a map for item names
    const itemNameMap = {};
    itemsWithNames.forEach(item => {
      itemNameMap[item.itemId] = item.name; // Map itemId to name
    });

    // Calculate total sold quantity
    const totalSold = groupedItems.reduce((acc, item) => acc + item.sold, 0);

    // Add item names and percentage to the grouped items
    finalItems = groupedItems.map(item => ({
      itemId: item.itemId,
      sold: item.sold,
      name: itemNameMap[item.itemId] || null, // Add name or null if not found
      percentage: totalSold ? ((item.sold / totalSold) * 100).toFixed(2) : 0 // Calculate percentage
    }));
  }
  // Return the final report with currentOutcome and growthOutcome
  return {
    totalIncome: currentTotalIncome,
    totalTransactions: currentTotalTransactions,
    growthIncome,
    growthTransactions,
    currentOutcome: currentTotalOutcome, // Include currentOutcome
    growthOutcome, // Include growthOutcome
    items: finalItems, // Use the grouped items here
    materialsPurchased: allMaterialsPurchased

  };
};


exports.getReport = async (req, res) => {
  console.log('getting report')
  const { cafeId } = req.params;
  const { type } = req.query; // "daily", "weekly", "monthly", "yearly"
  let filter = type;
  if (!["daily", "weekly", "monthly", "yearly"].includes(filter)) {
    return res.status(400).json({ error: "Invalid filter type" });
  }


  const report = await getReportt(
    cafeId, filter);

  res.status(200).json(report);
  console.log(report)
};

exports.getReportt = async (cafeId, filter) => {
  const report = await getReportt(
    cafeId, filter);

  return report;
}

exports.getAnalytics = async (req, res) => {
  try {
    // Step 1: Handle tenant-level analytics (roleId == 0)
    if (req.user.roleId === 0) {
      await getAllTenantReports(req, res);
    } else if (req.user.roleId === 1) {
      // Step 2: Fetch cafes belonging to the owner (roleId == 1)
      const cafes = await Cafe.findAll({
        where: { ownerId: req.user.userId },
      });

      let totalIncome = 0; // Initialize total income counter
      let totalOutcome = 0; // Initialize total income counter

      // Step 3: Process each cafe
      for (const cafe of cafes) {
        // Fetching the report for each cafe
        const report = await getReportt(cafe.dataValues.cafeId, "monthly", true);
        cafe.dataValues.report = report; // Add the report to the cafe object

        // Calculate the total income and add it to the running total
        totalIncome += report.totalIncome;
        totalOutcome += report.currentOutcome;

        // Fetching the clerks for each cafe
        const clerks = await User.findAll({
          where: { cafeId: cafe.dataValues.cafeId },
        });
        cafe.dataValues.subItems = clerks; // Add the clerks to the cafe object
      }

      // Step 4: Log and return the response
      console.log(`Total Income from all cafes: ${totalIncome}`);
      res.status(200).json({ items: cafes, totalIncome, totalOutcome });
    }
  } catch (error) {
    // Improved error handling
    console.error('Error in fetching analytics:', error);
    res.status(500).json({
      message: "An error occurred while fetching analytics.",
      error: error.message,
    });
  }
};



async function getAllTenantReports(req, res) {
  try {
    const { type } = req.query; // "daily", "weekly", "monthly", "yearly"

    // Step 1: Fetch all tenants (users with roleId = 1)
    const tenants = await User.findAll({
      where: { roleId: 1 }, // Tenants have roleId = 1
      attributes: ['userId', 'username', 'email'] // Fetch userId and username
    });

    // Step 2: If no tenants are found, return an empty array
    if (tenants.length === 0) {
      return res.status(200).json([]);
    }

    // Step 3: Initialize an empty array to store the final result
    const tenantCafeReports = [];

    // Step 4: Initialize variable to accumulate total income from all tenants
    let totalIncomeFromAllTenant = 0;

    // Step 5: Loop through each tenant to fetch their cafes and calculate totalIncome
    for (let tenant of tenants) {
      // Fetch cafes for the current tenant
      const cafes = await Cafe.findAll({
        where: {
          ownerId: tenant.userId // Get cafes for the specific tenant by userId
        },
        attributes: ['cafeId', 'name', 'image', 'ownerId', 'welcomePageConfig', 'createdAt', 'updatedAt'] // Cafe details
      });

      // If the tenant owns no cafes, skip to the next tenant
      if (cafes.length === 0) {
        continue;
      }

      // Step 6: Fetch reports for each cafe owned by this tenant in parallel
      const reports = await Promise.all(
        cafes.map(cafe => getReportt(cafe.cafeId, 'monthly', false)) // Fetch report for each cafe
      );

      // Step 7: Calculate the total income for the current tenant
      const totalIncomeForTenant = reports.reduce((sum, report) => {
        return sum + (report?.totalIncome || 0); // Add the totalIncome for each cafe's report
      }, 0);
      const totalOutcomeForTenant = reports.reduce((sum, report) => {
        return sum + (report?.currentOutcome || 0); // Add the totalIncome for each cafe's report
      }, 0);

      // Add this tenant's total income to the overall total income
      totalIncomeFromAllTenant += totalIncomeForTenant;

      // Step 8: Add the tenant with their cafes and corresponding reports to the result
      const tenantWithCafesAndReports = {
        userId: tenant.userId,
        username: tenant.username,
        email: tenant.email,
        totalIncome: totalIncomeForTenant, // Add the total income for this tenant
        totalOutcome: totalOutcomeForTenant, // Add the total income for this tenant
        subItems: cafes.map((cafe, index) => ({
          ...cafe.dataValues, // Include all cafe details
          report: reports[index] // Attach the corresponding report
        }))
      };

      // Add the tenant's data to the final result
      tenantCafeReports.push(tenantWithCafesAndReports);
    }

    // Step 9: Return the final result with tenants, cafes, reports, total income from all tenants
    res.status(200).json({
      totalIncome: totalIncomeFromAllTenant, // Add the total income from all tenants
      items: tenantCafeReports // Add tenants data with their cafes and reports
    });

  } catch (error) {
    console.error("Error fetching tenant reports:", error);
    res.status(500).json({ error: "Could not fetch tenant reports" });
  }
};


