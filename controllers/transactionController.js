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

    res
      .status(201)
      .json({ message: "Transactions created successfully", auth: token });
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
