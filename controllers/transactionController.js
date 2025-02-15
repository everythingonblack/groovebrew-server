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
  Coupon,
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

  const cafe = await Cafe.findByPk(cafeId);
  console.log(cafe.ownerId)
  if (req.user.cafeId != cafeId && req.user.userId != cafe.ownerId) {
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
  const { demandLength, idsOnly } = req.query;
  console.log('aaaaaaa')

  const cafe = await Cafe.findByPk(cafeId);

  if (!cafe || req.user.cafeId != cafeId && req.user.userId != cafe.ownerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Convert demandLength to integer and set limit
    const limit = parseInt(demandLength, 10);

    // Prepare the query options
    const queryOptions = {
      where: { cafeId: cafeId },
      order: [["createdAt", "DESC"]], // Sort by creation date, descending
    };

    // If idsOnly is true, apply the 24-hour filter and only return transactionId
    if (idsOnly === "true") {
      const twentyFourHoursAgo = moment().subtract(24, 'hours').toDate();
      queryOptions.where.createdAt = { [Op.gte]: twentyFourHoursAgo }; // Filter for last 24 hours
      queryOptions.attributes = ['transactionId']; // Only include transactionId in results
    } else {
      // If idsOnly is false or not provided, include related models
      queryOptions.include = [
        {
          model: DetailedTransaction,
          include: [Item], // Include associated Item model
        },
        {
          model: Table,
        },
      ];

      // Apply the limit if it's not -1
      if (limit !== -1) {
        queryOptions.limit = limit;
      }
    }

    // Retrieve transactions
    const transactions = await Transaction.findAll(queryOptions);
    console.log(transactions)
    // Return the response
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


const get24hback = (now) => {
  // Clone `now` to avoid modifying the original object
  let nn = now.clone(); // For moment.js or dayjs, use `.clone()`
  nn.set('hours', 0);
  nn.set('minutes', 0);
  nn.set('seconds', 0);
  nn.set('milliseconds', 0);

  // Subtract one day from the cloned date
  nn.subtract(1, 'days');

  return nn;
};

exports.generateReport = async (cafeId, now, cafeTimezone) => {
  const createdDate = new Date(now).toISOString();

  const endOfDay = now;
  const startOfDay = get24hback(now); // Midnight of the previous day

  // Find all detailed transactions for the specified cafe within the last day
  const detailedTransactions = await DetailedTransaction.findAll({
    where: {
      createdAt: {
        [Op.between]: [startOfDay, endOfDay],
      },
      '$Transaction.cafeId$': cafeId, // Join on cafeId
    },
    include: [{
      model: Transaction,
      attributes: ['transactionId'], // Include transactionId to track transactions
    }, {
      model: Item, // Assuming you have an Item model to get item price
      attributes: ['itemId', 'name', 'price'], // Include itemId and price
    }],
  });

  // Fetch material mutations for the specified cafe
  const materialMutations = await MaterialMutation.findAll({
    include: [
      {
        model: Material,
        where: { cafeId },
        attributes: ['name'],
      },
    ],
    where: {
      newStock: { [Op.gt]: sequelize.col("oldStock") },
      createdAt: {
        [Op.between]: [startOfDay, endOfDay]
      },
    },
  });

  // Initialize hourly bins for income, outcome, transactions, and materialIds
  const hourlyData = {
    hour0To3: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour3To6: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour6To9: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour9To12: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour12To15: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour15To18: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour18To21: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() },
    hour21To24: { income: 0, outcome: 0, transactions: [], materialIds: [], uniqueTransactions: new Set() }
  };

  detailedTransactions.forEach(detailedTransaction => {
    const transactionId = detailedTransaction.Transaction.transactionId;
    const itemId = detailedTransaction.itemId;
    const itemName = detailedTransaction.Item.dataValues.name;
    const sold = detailedTransaction.qty;
    const price = detailedTransaction.Item.price; // Get item price
    const createdAt = moment(detailedTransaction.createdAt).tz(cafeTimezone); // Convert to cafe's local time

    // Determine the time period (hour) for the transaction based on cafe's local time
    const hour = createdAt.hours(); // Get the hour after conversion to local time
    let hourRange = '';

    if (hour >= 0 && hour < 3) {
      hourRange = 'hour0To3';
    } else if (hour >= 3 && hour < 6) {
      hourRange = 'hour3To6';
    } else if (hour >= 6 && hour < 9) {
      hourRange = 'hour6To9';
    } else if (hour >= 9 && hour < 12) {
      hourRange = 'hour9To12';
    } else if (hour >= 12 && hour < 15) {
      hourRange = 'hour12To15';
    } else if (hour >= 15 && hour < 18) {
      hourRange = 'hour15To18';
    } else if (hour >= 18 && hour < 21) {
      hourRange = 'hour18To21';
    } else if (hour >= 21 && hour < 24) {
      hourRange = 'hour21To24';
    }

    // Calculate the total price for this item sold in the current transaction
    const totalPrice = sold * price;

    // Update the corresponding hourly data (income, outcome, transactions, materials)
    hourlyData[hourRange].income += totalPrice;

    // Add the transaction to the unique transactions set (to avoid double counting)
    hourlyData[hourRange].uniqueTransactions.add(transactionId);

    // Push the item details to the transactions array (for reporting purposes)
    hourlyData[hourRange].transactions.push({
      transactionId,
      itemId,
      itemName,
      sold,
      totalPrice,
    });
  });

  // Process material mutations and categorize them by hour, and calculate outcome
  materialMutations.forEach(mutation => {
    const materialId = mutation.dataValues.materialId;
    const materialName = mutation.Material.dataValues.name;
    const priceAtp = mutation.dataValues.priceAtp;
    const stockDifference = mutation.dataValues.newStock - mutation.dataValues.oldStock;
    const createdAt = moment(mutation.createdAt).tz(cafeTimezone); // Convert to cafe's local time

    // Determine the time period (hour) for the mutation based on cafe's local time
    const hour = createdAt.hours();
    let hourRange = '';

    if (hour >= 0 && hour < 3) {
      hourRange = 'hour0To3';
    } else if (hour >= 3 && hour < 6) {
      hourRange = 'hour3To6';
    } else if (hour >= 6 && hour < 9) {
      hourRange = 'hour6To9';
    } else if (hour >= 9 && hour < 12) {
      hourRange = 'hour9To12';
    } else if (hour >= 12 && hour < 15) {
      hourRange = 'hour12To15';
    } else if (hour >= 15 && hour < 18) {
      hourRange = 'hour15To18';
    } else if (hour >= 18 && hour < 21) {
      hourRange = 'hour18To21';
    } else if (hour >= 21 && hour < 24) {
      hourRange = 'hour21To24';
    }

    // Calculate the outcome for this material mutation (priceAtp * stockDifference)
    const materialOutcome = priceAtp * stockDifference;

    // Update the corresponding hourly outcome
    hourlyData[hourRange].outcome += materialOutcome;

    // Add the materialId and details for each mutation
    hourlyData[hourRange].materialIds.push({
      materialId,
      materialName,
      priceAtp,
      stockDifference,
      materialOutcome,
    });
  });

  // Calculate the total income, outcome, and transactions for the entire day
  const totalIncome = Object.values(hourlyData).reduce((acc, data) => acc + data.income, 0);
  const totalOutcome = Object.values(hourlyData).reduce((acc, data) => acc + data.outcome, 0);

  // Now use the uniqueTransactions set to calculate totalTransactions
  const totalTransactions = Object.values(hourlyData).reduce((acc, data) => acc + data.uniqueTransactions.size, 0);

  // Save the new daily report to the database
  await DailyReport.create({
    date: createdDate,
    cafeId,

    // Updated field names based on new hourly ranges
    hour0To3Income: hourlyData.hour0To3.income,
    hour0To3Outcome: hourlyData.hour0To3.outcome,
    hour0To3Transactions: hourlyData.hour0To3.transactions, // Store TransactionIds as JSON
    hour0To3MaterialIds: hourlyData.hour0To3.materialIds,

    hour3To6Income: hourlyData.hour3To6.income,
    hour3To6Outcome: hourlyData.hour3To6.outcome,
    hour3To6Transactions: hourlyData.hour3To6.transactions,
    hour3To6MaterialIds: hourlyData.hour3To6.materialIds,

    hour6To9Income: hourlyData.hour6To9.income,
    hour6To9Outcome: hourlyData.hour6To9.outcome,
    hour6To9Transactions: hourlyData.hour6To9.transactions,
    hour6To9MaterialIds: hourlyData.hour6To9.materialIds,

    hour9To12Income: hourlyData.hour9To12.income,
    hour9To12Outcome: hourlyData.hour9To12.outcome,
    hour9To12Transactions: hourlyData.hour9To12.transactions,
    hour9To12MaterialIds: hourlyData.hour9To12.materialIds,

    hour12To15Income: hourlyData.hour12To15.income,
    hour12To15Outcome: hourlyData.hour12To15.outcome,
    hour12To15Transactions: hourlyData.hour12To15.transactions,
    hour12To15MaterialIds: hourlyData.hour12To15.materialIds,

    hour15To18Income: hourlyData.hour15To18.income,
    hour15To18Outcome: hourlyData.hour15To18.outcome,
    hour15To18Transactions: hourlyData.hour15To18.transactions,
    hour15To18MaterialIds: hourlyData.hour15To18.materialIds,

    hour18To21Income: hourlyData.hour18To21.income,
    hour18To21Outcome: hourlyData.hour18To21.outcome,
    hour18To21Transactions: hourlyData.hour18To21.transactions,
    hour18To21MaterialIds: hourlyData.hour18To21.materialIds,

    hour21To24Income: hourlyData.hour21To24.income,
    hour21To24Outcome: hourlyData.hour21To24.outcome,
    hour21To24Transactions: hourlyData.hour21To24.transactions,
    hour21To24MaterialIds: hourlyData.hour21To24.materialIds,

    totalIncome,
    totalOutcome,
    totalTransactions
  });

  console.log(`Report generated for cafe ${cafeId} on ${startOfDay.format()}`);
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
      attributes: ['transactionId'], // Include transactionId to track transactions
    }, {
      model: Item, // Assuming you have an Item model to get item price
      attributes: ['itemId', 'price'], // Include itemId and price
    }],
  });

  // Fetch material mutations for the specified cafe
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

  // Initialize hourly bins for income, outcome, transactions, and materialIds
  const hourlyData = {
    hour1To3: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour4To6: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour7To9: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour10To12: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour13To15: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour16To18: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour19To21: { income: 0, outcome: 0, transactions: [], materialIds: [] },
    hour22To24: { income: 0, outcome: 0, transactions: [], materialIds: [] },
  };

  // Process detailed transactions and categorize them by hour
  detailedTransactions.forEach(detailedTransaction => {
    const transactionId = detailedTransaction.Transaction.transactionId;
    const itemId = detailedTransaction.itemId;
    const sold = detailedTransaction.qty;
    const price = detailedTransaction.Item.price; // Get item price
    const createdAt = new Date(detailedTransaction.createdAt); // Transaction time

    // Determine the time period (hour) for the transaction
    const hour = createdAt.getHours();
    let hourRange = '';
    if (hour >= 1 && hour < 3) {
      hourRange = 'hour1To3';
    } else if (hour >= 4 && hour < 6) {
      hourRange = 'hour4To6';
    } else if (hour >= 7 && hour < 9) {
      hourRange = 'hour7To9';
    } else if (hour >= 10 && hour < 12) {
      hourRange = 'hour10To12';
    } else if (hour >= 13 && hour < 15) {
      hourRange = 'hour13To15';
    } else if (hour >= 16 && hour < 18) {
      hourRange = 'hour16To18';
    } else if (hour >= 19 && hour < 21) {
      hourRange = 'hour19To21';
    } else {
      hourRange = 'hour22To24';
    }

    // Calculate the total price for this item sold in the current transaction
    const totalPrice = sold * price;

    // Update the corresponding hourly data (income, outcome, transactions, materials)
    hourlyData[hourRange].income += totalPrice;
    hourlyData[hourRange].transactions.push({
      transactionId,
      itemId,
      sold,
      totalPrice,
    });
  });

  // Process material mutations and categorize them by hour, and calculate outcome
  materialMutations.forEach(mutation => {
    const materialId = mutation.dataValues.materialId;
    const priceAtp = mutation.dataValues.priceAtp;
    const stockDifference = mutation.dataValues.newStock - mutation.dataValues.oldStock;
    const createdAt = new Date(mutation.createdAt); // Mutation time

    // Determine the time period (hour) for the mutation
    const hour = createdAt.getHours();
    let hourRange = '';
    if (hour >= 1 && hour < 3) {
      hourRange = 'hour1To3';
    } else if (hour >= 4 && hour < 6) {
      hourRange = 'hour4To6';
    } else if (hour >= 7 && hour < 9) {
      hourRange = 'hour7To9';
    } else if (hour >= 10 && hour < 12) {
      hourRange = 'hour10To12';
    } else if (hour >= 13 && hour < 15) {
      hourRange = 'hour13To15';
    } else if (hour >= 16 && hour < 18) {
      hourRange = 'hour16To18';
    } else if (hour >= 19 && hour < 21) {
      hourRange = 'hour19To21';
    } else {
      hourRange = 'hour22To24';
    }

    // Calculate the outcome for this material mutation (priceAtp * stockDifference)
    const materialOutcome = priceAtp * stockDifference;

    // Update the corresponding hourly outcome
    hourlyData[hourRange].outcome += materialOutcome;

    // Add the materialId and details for each mutation
    hourlyData[hourRange].materialIds.push({
      materialId,
      priceAtp,
      stockDifference,
      materialOutcome,
    });
  });

  // Calculate the total income, outcome, and transactions for the entire day
  const totalIncome = Object.values(hourlyData).reduce((acc, data) => acc + data.income, 0);
  const totalOutcome = Object.values(hourlyData).reduce((acc, data) => acc + data.outcome, 0);
  const totalTransactions = Object.values(hourlyData).reduce((acc, data) => acc + data.transactions.length, 0);

  // Save the new daily report to the database
  await DailyReport.create({
    date: startOfDay,
    cafeId,
    hour1To3Income: hourlyData.hour1To3.income,
    hour1To3Outcome: hourlyData.hour1To3.outcome,
    hour1To3Transactions: JSON.stringify(hourlyData.hour1To3.transactions), // Store TransactionIds as JSON
    hour1To3MaterialIds: JSON.stringify(hourlyData.hour1To3.materialIds),

    hour4To6Income: hourlyData.hour4To6.income,
    hour4To6Outcome: hourlyData.hour4To6.outcome,
    hour4To6Transactions: JSON.stringify(hourlyData.hour4To6.transactions),
    hour4To6MaterialIds: JSON.stringify(hourlyData.hour4To6.materialIds),

    hour7To9Income: hourlyData.hour7To9.income,
    hour7To9Outcome: hourlyData.hour7To9.outcome,
    hour7To9Transactions: JSON.stringify(hourlyData.hour7To9.transactions),
    hour7To9MaterialIds: JSON.stringify(hourlyData.hour7To9.materialIds),

    hour10To12Income: hourlyData.hour10To12.income,
    hour10To12Outcome: hourlyData.hour10To12.outcome,
    hour10To12Transactions: JSON.stringify(hourlyData.hour10To12.transactions),
    hour10To12MaterialIds: JSON.stringify(hourlyData.hour10To12.materialIds),

    hour13To15Income: hourlyData.hour13To15.income,
    hour13To15Outcome: hourlyData.hour13To15.outcome,
    hour13To15Transactions: JSON.stringify(hourlyData.hour13To15.transactions),
    hour13To15MaterialIds: JSON.stringify(hourlyData.hour13To15.materialIds),

    hour16To18Income: hourlyData.hour16To18.income,
    hour16To18Outcome: hourlyData.hour16To18.outcome,
    hour16To18Transactions: JSON.stringify(hourlyData.hour16To18.transactions),
    hour16To18MaterialIds: JSON.stringify(hourlyData.hour16To18.materialIds),

    hour19To21Income: hourlyData.hour19To21.income,
    hour19To21Outcome: hourlyData.hour19To21.outcome,
    hour19To21Transactions: JSON.stringify(hourlyData.hour19To21.transactions),
    hour19To21MaterialIds: JSON.stringify(hourlyData.hour19To21.materialIds),

    hour22To24Income: hourlyData.hour22To24.income,
    hour22To24Outcome: hourlyData.hour22To24.outcome,
    hour22To24Transactions: JSON.stringify(hourlyData.hour22To24.transactions),
    hour22To24MaterialIds: JSON.stringify(hourlyData.hour22To24.materialIds),

    totalIncome,
    totalOutcome,
    totalTransactions,
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




async function getReportFunction(cafeId, type) {
  try {

    // Fetch cafe's timezone (ensure this data exists in your database)
    const cafe = await Cafe.findByPk(cafeId);
    if (!cafe || !cafe.timezone) {
      return null;
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
        return null;
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
    const spendMaterials = {};
    let totalSpendItems = 0;

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
    currentReports2.forEach(report => {
      for (let i = 0; i <= 23; i++) {
        const hourMaterialIds = report[`hour${i}To${i + 3}MaterialIds`]; // e.g. hour0To3Transactions
        if (hourMaterialIds && hourMaterialIds.length > 0) {
          hourMaterialIds.forEach(mutation => {
            const { materialId, stockDifference, materialName } = mutation;
            if (!spendMaterials[materialId]) {
              spendMaterials[materialId] = { spend: 0, materialName };
            }
            spendMaterials[materialId].spend += stockDifference;
            spendMaterials[materialId].materialName = materialName;
            totalSpendItems += stockDifference;
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

    const materialPercentage = Object.keys(spendMaterials).map(materialId => {
      const itemData = spendMaterials[materialId];
      const percentage = ((itemData.spend / totalSpendItems) * 100).toFixed(2);
      return {
        materialId: Number(materialId),
        spend: itemData.spend,
        materialName: itemData.materialName || '',
        percentage,
      };
    }).sort((a, b) => b.spend - a.spend); // Sort by 'sold' in descending order


    // Aggregation for yearly (by quarters)
    const aggregateByQuarters = (reports, startDate, endDate) => {
      const quarters = [];
      let currentQuarterStart = moment(startDate).startOf('quarter');
      let currentQuarterEnd = currentQuarterStart.clone().endOf('quarter');

      while (currentQuarterStart.isBefore(endDate)) {
        const quarterData = reports.filter(report => {
          const reportDate = moment(report.date);
          return reportDate.isBetween(currentQuarterStart, currentQuarterEnd, null, '[)');
        });

        quarters.push({
          dateRange: {
            start: currentQuarterStart.format('YYYY-MM-DD'),
            end: currentQuarterEnd.format('YYYY-MM-DD')
          },
          income: quarterData.reduce((sum, report) => sum + report.totalIncome, 0),
          outcome: quarterData.reduce((sum, report) => sum + report.totalOutcome, 0),
          transactions: quarterData.reduce((sum, report) => sum + report.totalTransactions, 0),
        });

        currentQuarterStart = currentQuarterStart.clone().add(1, 'quarter');
        currentQuarterEnd = currentQuarterStart.clone().endOf('quarter');
      }

      return quarters;
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
      transactionGraph: currentReports.map((r) => ({
        date: moment(r.date).format("YYYY-MM-DD"),
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
        date: moment(r.date).format("YYYY-MM-DD"),
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
      materialSpend: materialPercentage,
      aggregatedCurrentReports,  // Current aggregation (monthly or yearly)
      aggregatedPreviousReports,  // Previous aggregation (monthly or yearly)
    };

    return report;

  } catch (err) {
    console.error(err);
    return null;
  }
}


exports.getReport = async (req, res) => {
  const { cafeId } = req.params;
  const { type } = req.query; // "yesterday", "weekly", "monthly", "yearly"

  const report = await getReportFunction(cafeId, type)
  if (report) return res.status(200).json(report);
  else return res.status(500).json({ error: 'Failed to generate report.' });
};



// exports.getReport = async (req, res) => {
//   try {
//     const { cafeId } = req.params;
//     const { type } = req.query; // "yesterday", "weekly", "monthly", "yearly"

//     // Fetch cafe's timezone (ensure this data exists in your database)
//     const cafe = await Cafe.findByPk(cafeId);
//     if (!cafe || !cafe.timezone) {
//       return res.status(404).json({ error: 'Cafe not found or timezone not set.' });
//     }
//     const timezone = cafe.timezone; // e.g., 'Asia/Jakarta' 'Pacific/Kiritimati'

//     // Determine the date range based on the type relative to the cafe's timezone
//     let startDate, endDate, previousStartDate, previousEndDate;

//     const today = moment.tz(timezone); // Get the current time in cafe's timezone
//     // Adjust the time for the start of the day in the cafe's timezone
//     const startOfDay = today.clone().startOf('day'); // 00:00:00 in cafe's timezone

//     // Switch based on the type of report
//     switch (type) {
//       case "yesterday":
//         startDate = startOfDay.clone().subtract(1, "days");
//         endDate = startOfDay.clone().subtract(1, "days").endOf("day");
//         previousStartDate = startOfDay.clone().subtract(2, "days");
//         previousEndDate = startOfDay.clone().subtract(2, "days").endOf("day");
//         break;

//       case "weekly":
//         startDate = startOfDay.clone().subtract(7, "days");
//         endDate = startOfDay.clone().subtract(1, "days").endOf("day");
//         previousStartDate = startOfDay.clone().subtract(14, "days");
//         previousEndDate = startOfDay.clone().subtract(8, "days").endOf("day");
//         break;

//       case "monthly":
//         startDate = startOfDay.clone().subtract(30, "days");
//         endDate = startOfDay.clone().subtract(1, "days").endOf("day");
//         previousStartDate = startOfDay.clone().subtract(60, "days");
//         previousEndDate = startOfDay.clone().subtract(31, "days").endOf("day");
//         break;

//       case "yearly":
//         startDate = startOfDay.clone().subtract(365, "days");
//         endDate = startOfDay.clone().subtract(1, "days").endOf("day");
//         previousStartDate = startOfDay.clone().subtract(730, "days");
//         previousEndDate = startOfDay.clone().subtract(366, "days").endOf("day");
//         break;

//       default:
//         return res.status(400).json({ error: 'Invalid report type.' });
//     }

//     // Fetch reports for the current and previous periods
//     const currentReports = await DailyReport.findAll({
//       where: {
//         cafeId,
//         date: { [Op.gte]: startDate.toDate(), [Op.lt]: endDate.toDate() },
//       },
//     });

//     const previousReports = await DailyReport.findAll({
//       where: {
//         cafeId,
//         date: { [Op.gte]: previousStartDate.toDate(), [Op.lt]: previousEndDate.toDate() },
//       },
//     });

//     // Helper to calculate totals
//     const calculateTotals = (reports) => {
//       return reports.reduce(
//         (totals, report) => {
//           totals.income += report.totalIncome;
//           totals.outcome += report.totalOutcome;
//           totals.transactions += report.totalTransactions;
//           return totals;
//         },
//         { income: 0, outcome: 0, transactions: 0 }
//       );
//     };

//     const currentTotals = calculateTotals(currentReports);
//     const previousTotals = calculateTotals(previousReports);

//     // Calculate growth percentages
//     const calculateGrowth = (current, previous) => {
//       if (previous === 0) return current > 0 ? 100 : 0;
//       return ((current - previous) / previous) * 100;
//     };

//     const incomeGrowth = calculateGrowth(currentTotals.income, previousTotals.income);
//     const outcomeGrowth = calculateGrowth(currentTotals.outcome, previousTotals.outcome);
//     const transactionGrowth = calculateGrowth(currentTotals.transactions, previousTotals.transactions);

//     // Aggregate sold items
//     const soldItems = {};
//     let totalSoldItems = 0;

//     currentReports.forEach(report => {
//       // Loop through all hourly transactions for each report
//       for (let i = 0; i <= 23; i++) {
//         const hourTransactions = report[hour${i}To${i+3}Transactions]; // e.g. hour0To3Transactions
//         if (hourTransactions && hourTransactions.length > 0) {
//           hourTransactions.forEach(transaction => {
//             const { itemId, sold, itemName } = transaction;
//             console.log(transaction)
//             if (!soldItems[itemId]) {
//               soldItems[itemId] = { sold: 0, name: itemName };
//             }
//             soldItems[itemId].sold += sold;
//             soldItems[itemId].name = itemName;
//             totalSoldItems += sold;
//           });
//         }
//       }
//     });

//     // Calculate percentage for each sold item
//     const itemPercentage = Object.keys(soldItems).map(itemId => {
//       const itemData = soldItems[itemId];
//       const percentage = ((itemData.sold / totalSoldItems) * 100).toFixed(2);
//       return {
//         itemId: Number(itemId),
//         sold: itemData.sold,
//         name: itemData.name || '',
//         percentage,
//       };
//     }).sort((a, b) => b.sold - a.sold); // Sort by 'sold' in descending order   

//     // Prepare the report
//     const report = {
//       type,
//       dateRange: { startDate, endDate },
//       currentTotals,
//       previousTotals,
//       growth: {
//         incomeGrowth,
//         outcomeGrowth,
//         transactionGrowth,
//       },
//       transactionGraph: currentReports.map((r) => ({
//         date: r.date,
//         hour0To3Transactions: r.hour0To3Transactions,
//         hour3To6Transactions: r.hour3To6Transactions,
//         hour6To9Transactions: r.hour6To9Transactions,
//         hour9To12Transactions: r.hour9To12Transactions,
//         hour12To15Transactions: r.hour12To15Transactions,
//         hour15To18Transactions: r.hour15To18Transactions,
//         hour18To21Transactions: r.hour18To21Transactions,
//         hour21To24Transactions: r.hour21To24Transactions,
//       })),
//       materialGraph: currentReports.map((r) => ({
//         date: r.date,
//         hour0To3MaterialIds: r.hour0To3MaterialIds,
//         hour3To6MaterialIds: r.hour3To6MaterialIds,
//         hour6To9MaterialIds: r.hour6To9MaterialIds,
//         hour9To12MaterialIds: r.hour9To12MaterialIds,
//         hour12To15MaterialIds: r.hour12To15MaterialIds,
//         hour15To18MaterialIds: r.hour15To18MaterialIds,
//         hour18To21MaterialIds: r.hour18To21MaterialIds,
//         hour21To24MaterialIds: r.hour21To24MaterialIds,
//       })),
//       itemSales: itemPercentage, // Add item sales data here
//     };

//     // Send the response
//     res.json(report);
//   } catch (error) {
//     console.error('Error fetching report:', error);
//     res.status(500).json({ error: 'An error occurred while fetching the report.' });
//   }
// };

exports.getReport3 = async (req, res) => {
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

// Helper function to calculate growth percentage
function calculateGrowth(currentValue, previousValue) {
  if (previousValue === 0) return currentValue > 0 ? 100 : 0;
  return ((currentValue - previousValue) / previousValue) * 100;
}

exports.getAnalytics = async (req, res) => {
  try {
    const { type } = req.query; // "yesterday", "weekly", "monthly", "yearly"

    // Step 1: Handle tenant-level analytics (roleId == 0)
    if (req.user.roleId === 0) {
      await getAllTenantReports(req, res);
    } else if (req.user.roleId === 1) {
      // Step 2: Fetch cafes belonging to the owner (roleId == 1)
      const cafes = await Cafe.findAll({
        where: { ownerId: req.user.userId },
      });

      let income = 0; // Initialize total income counter
      let outcome = 0; // Initialize total outcome counter
      let transactions = 0;

      let previousIncome = 0; // Initialize total previous income counter
      let previousOutcome = 0; // Initialize total previous outcome counter
      let previousTransactions = 0; // Initialize total previous transactions counter

      let incomeGrowth;
      let outcomeGrowth;
      let transactionGrowth;

      let combinedTransactionGraph = {}; // Initialize an object to accumulate the transaction graphs by date
      let combinedMaterialGraph = {}; // Initialize an object to accumulate the transaction graphs by date
      let aggregatedCurrentReports = {}; // Using an object to combine reports based on dateRange
      let aggregatedPreviousReports = {}; // Using an object to combine reports based on dateRange

      try {
        // Step 3: Process each cafe
        for (const cafe of cafes) {
          try {
            // Fetching the report for each cafe
            const report = await getReportFunction(cafe.dataValues.cafeId, type == undefined ? "weekly" : type);
            cafe.dataValues.report = report; // Add the report to the cafe object

            // Calculate the total income and add it to the running total
            income += report?.currentTotals.income;
            outcome += report?.currentTotals.outcome;
            transactions += report?.currentTotals.transactions;

            previousIncome += report?.previousTotals.income;
            previousOutcome += report?.previousTotals.outcome;
            previousTransactions += report?.previousTotals.transactions;

            // Calculate Growth for each metric (income, outcome, transactions)
            incomeGrowth = calculateGrowth(income, previousIncome);
            outcomeGrowth = calculateGrowth(outcome, previousOutcome);
            transactionGrowth = calculateGrowth(transactions, previousTransactions);

            // If it's not "monthly" or "yearly", combine transaction graphs
            if (type !== "monthly" && type !== "yearly") {
              // Combine transaction graphs by date (ignoring time)
              report.transactionGraph.forEach((transactionData) => {
                const date = transactionData.date;

                // If this date hasn't been encountered yet, initialize it
                if (!combinedTransactionGraph[date]) {
                  combinedTransactionGraph[date] = {
                    date,
                    hour0To3Transactions: [],
                    hour3To6Transactions: [],
                    hour6To9Transactions: [],
                    hour9To12Transactions: [],
                    hour12To15Transactions: [],
                    hour15To18Transactions: [],
                    hour18To21Transactions: [],
                    hour21To24Transactions: [],
                  };
                }

                // Merge the transaction data into the corresponding date entry
                Object.keys(transactionData).forEach((key) => {
                  if (key !== 'date') {
                    combinedTransactionGraph[date][key] = [
                      ...(combinedTransactionGraph[date][key] || []),
                      ...transactionData[key],
                    ];
                  }
                });
              });
              console.log(report.materialGraph)
              report.materialGraph.forEach((mutationData) => {
                const date = mutationData.date;

                // If this date hasn't been encountered yet, initialize it
                if (!combinedMaterialGraph[date]) {
                  combinedMaterialGraph[date] = {
                    date,
                    hour0To3MaterialIds: [],
                    hour3To6MaterialIds: [],
                    hour6To9MaterialIds: [],
                    hour9To12MaterialIds: [],
                    hour12To15MaterialIds: [],
                    hour15To18MaterialIds: [],
                    hour18To21MaterialIds: [],
                    hour21To24MaterialIds: [],
                  };
                }

                // Merge the transaction data into the corresponding date entry
                Object.keys(mutationData).forEach((key) => {
                  if (key !== 'date') {
                    combinedMaterialGraph[date][key] = [
                      ...(combinedMaterialGraph[date][key] || []),
                      ...mutationData[key],
                    ];
                  }
                });
              });
            } else {
              // Aggregated report (monthly/yearly), so we combine reports based on date range
              report?.aggregatedCurrentReports.forEach(aggregatedReport => {
                const dateRangeKey = `${aggregatedReport.dateRange.start}_${aggregatedReport.dateRange.end}`;

                // If the date range hasn't been encountered yet, initialize it
                if (!aggregatedCurrentReports[dateRangeKey]) {
                  aggregatedCurrentReports[dateRangeKey] = {
                    dateRange: aggregatedReport.dateRange,
                    income: 0,
                    outcome: 0,
                    transactions: 0,
                  };
                }

                // Add the current report's values to the corresponding date range
                aggregatedCurrentReports[dateRangeKey].income += aggregatedReport.income || 0;
                aggregatedCurrentReports[dateRangeKey].outcome += aggregatedReport.outcome || 0;
                aggregatedCurrentReports[dateRangeKey].transactions += aggregatedReport.transactions || 0;
              });
              // Aggregated report (monthly/yearly), so we combine reports based on date range
              report?.aggregatedPreviousReports.forEach(aggregatedReport => {
                const dateRangeKey = `${aggregatedReport.dateRange.start}_${aggregatedReport.dateRange.end}`;

                // If the date range hasn't been encountered yet, initialize it
                if (!aggregatedPreviousReports[dateRangeKey]) {
                  aggregatedPreviousReports[dateRangeKey] = {
                    dateRange: aggregatedReport.dateRange,
                    income: 0,
                    outcome: 0,
                    transactions: 0,
                  };
                }

                // Add the current report's values to the corresponding date range
                aggregatedPreviousReports[dateRangeKey].income += aggregatedReport.income || 0;
                aggregatedPreviousReports[dateRangeKey].outcome += aggregatedReport.outcome || 0;
                aggregatedPreviousReports[dateRangeKey].transactions += aggregatedReport.transactions || 0;
              });
            }
          } catch (error) {
            console.error(`Error fetching report for cafe ${cafe.cafeId}:`, error);
          }

          // Fetching the clerks for each cafe
          const clerks = await User.findAll({
            where: { cafeId: cafe.dataValues.cafeId },
          });
          cafe.dataValues.subItems = clerks; // Add the clerks to the cafe object
        }
      } catch (error) {
        console.error('Error processing cafes:', error);
      }

      // Convert the aggregated reports from object to array
      const aggregatedReportsArray = Object.values(aggregatedCurrentReports);
      const aggregatedPreviousReportsArray = Object.values(aggregatedPreviousReports);

      res.status(200).json({
        items: cafes,
        currentTotals: { income, outcome, transactions },
        previousTotals: { previousIncome, previousOutcome, previousTransactions },
        growth: { incomeGrowth, outcomeGrowth, transactionGrowth },
        // Include either combinedTransactionGraph or aggregatedReportsArray depending on type
        transactionGraph: type !== "monthly" && type !== "yearly" ? Object.values(combinedTransactionGraph) : null,
        materialGraph: type !== "monthly" && type !== "yearly" ? Object.values(combinedMaterialGraph) : null,
        aggregatedCurrentReports: type === "monthly" || type === "yearly" ? aggregatedReportsArray : null,
        aggregatedPreviousReports: type === "monthly" || type === "yearly" ? aggregatedPreviousReportsArray : null,
      });
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

      const coupons = await Coupon.findAll({
        where: {
          userId: tenant.userId,
        },
        order: [
          ['discountEndDate', 'ASC'], // Order by discountEndDate, oldest first
        ],
      });
      // Fetch cafes for the current tenant
      const cafes = await Cafe.findAll({
        where: {
          ownerId: tenant.userId // Get cafes for the specific tenant by userId
        },
        attributes: ['cafeId', 'name', 'image', 'ownerId'] // Cafe details
      });

      // Step 6: Fetch reports for each cafe owned by this tenant in parallel
      // const reports = await Promise.all(
      //   cafes.map(cafe => getReportFunction(cafe.cafeId, 'monthly')) // Fetch report for each cafe
      // );

      // // Step 7: Calculate the total income for the current tenant
      // const totalIncomeForTenant = reports.reduce((sum, report) => {
      //   return sum + (report?.currentTotals?.income || 0); // Add the totalIncome for each cafe's report
      // }, 0);

      // // Add this tenant's total income to the overall total income
      // totalIncomeFromAllTenant += totalIncomeForTenant;

      // Step 8: Add the tenant with their cafes and corresponding reports to the result
      const tenantWithCafesAndReports = {
        userId: tenant.userId,
        username: tenant.username,
        email: tenant.email,
        coupons,
        // totalIncome: totalIncomeForTenant, // Add the total income for this tenant
        subItems: cafes.map((cafe) => ({
          ...cafe.dataValues, // Include all cafe details
          // report: reports[index] // Attach the corresponding report
        }))
      };

      // Add the tenant's data to the final result
      tenantCafeReports.push(tenantWithCafesAndReports);
    }

    // Step 9: Return the final result with tenants, cafes, reports, total income from all tenants
    res.status(200).json({
      // totalIncome: totalIncomeFromAllTenant, // Add the total income from all tenants
      items: tenantCafeReports // Add tenants data with their cafes and reports
    });

  } catch (error) {
    console.error("Error fetching tenant reports:", error);
    res.status(500).json({ error: "Could not fetch tenant reports" });
  }
};


