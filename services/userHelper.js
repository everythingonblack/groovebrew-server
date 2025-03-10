const { User, Cafe } = require("../models");
const { io } = require("../index");
const { sendNotifications } = require("./notificationServices");

// [this is guestSide socketId, this is the code for qr]
const qrCodeSocketMap = {};

// this contain [userId, roleId, socketId]
const userList = [];

// [this is the clerkId, this is the clerk socketId, this is the guestSide socketId, this is the guestSide sessionId]
const guestSideList = [];

// Function to store QR code with shopId
function storeQRCode(socketId, qrCode) {
  qrCodeSocketMap[socketId] = [qrCode]; // Store qrCode and shopId in an array against socketId
}

// Function to get QR code by socketId
function getQRCodeBySocketId(socketId) {
  if (qrCodeSocketMap[socketId]) {
    return qrCodeSocketMap[socketId][0]; // Return qrCode stored at index 0
  }
  return null;
}

// Function to delete QR code by socketId
function deleteQRCodeBySocketId(socketId) {
  if (qrCodeSocketMap[socketId]) {
    const [qrCode] = qrCodeSocketMap[socketId];
    delete qrCodeSocketMap[socketId];
    return { qrCode };
  }
  return null;
}

// Function to get socketId and shopId by qrCode
function getSocketIdAndShopIdByQRCode(qrCode) {
  const socketId = Object.keys(qrCodeSocketMap).find(
    (socketId) => qrCodeSocketMap[socketId][0] === qrCode
  );
  if (socketId) {
    return { socketId };
  }
  return null;
}

// Function to create guest side session
function createGuestSideSession(sessionDetails) {
  guestSideList.push(sessionDetails);
}

// Function to get all guest side sessions
function getGuestSideSessions() {
  return guestSideList;
}

// Function to delete guest side session by socketId
function deleteGuestSideSessionBySocketId(socketId) {
  const index = guestSideList.findIndex((session) => session[2] === socketId);
  if (index !== -1) {
    guestSideList.splice(index, 1);
  }
}

// Function to delete guest side session by guest side sessionId
function deleteGuestSideSessionByGuestSideSessionId(userId, sessionId) {
  const index = guestSideList.findIndex((session) => session[3] === sessionId);
  if (index !== -1) {
    if (guestSideList[index][0] != userId) return false;
    const previousGuestSideSocket = guestSideList[index][2];
    guestSideList.splice(index, 1);

    return { guestSideList, previousGuestSideSocket };
  } else return false;
}

// Function to update guest side socketId by sessionCode
async function updateGuestSideSocketId(sessionCode, newSocketId) {
  const session = guestSideList.find((session) => session[3] === sessionCode);
  if (session) {
    session[2] = newSocketId;
    return true;
  }
  return false;
}

async function updateUserSocketId(user, newSocketId, shopIdThatOwnerOpen) {
  try {
    const { userId, roleId, cafeId } = user;
    console.log(user);
    // Check if userId already exists in userList
    const index = userList.findIndex((entry) => entry[0] === userId);

    if (index !== -1) {
      // Update existing entry
      userList[index] = [
        userId,
        roleId,
        newSocketId,
        (roleId === 1) ? shopIdThatOwnerOpen : 
        (roleId === 2) ? cafeId : 
        null,
    ];
    
      console.log(`User with userId ${userId} updated in userList.`);
    } else {
      // Add new entry
      if (roleId == 1 ) {
        userList.push([userId, roleId, newSocketId, shopIdThatOwnerOpen]);
      } else if(roleId ==2) {
        userList.push([userId, roleId, newSocketId, cafeId]);
      } else {
        userList.push([userId, roleId, newSocketId, null]);
      }
      console.log(
        `User with userId ${userId}  and roleId  ${roleId} and shopId ${shopIdThatOwnerOpen}added to userList.`
      );
    }

    // Update guestSideList if roleId is 2 (assuming clerkId is defined somewhere)
    if (roleId === 2) {
      const sessionIndex = guestSideList.findIndex(
        (session) => session[0] === userId
      );
      if (sessionIndex !== -1) {
        guestSideList[sessionIndex][1] = newSocketId;
      }
    }

    console.log("Updated userList:");
    console.log(userList);
  } catch (error) {
    console.error("Error updating user socketId:", error);
    return false;
  }
}

function getAllClerk(cafeId) {
  return userList.filter((user) => user[3] == cafeId);
}

async function sendMessageToAllClerk(cafeId, event, data) {
  // Step 1: Filter userList to get users (clerks) with the specified cafeId
  console.log(userList);
  console.log("ccccccccccccaaaaaaaaaaaafffffffffffffeeeeeeeeeee" + cafeId);
  const shopClerks = userList.filter((user) => user[3] == cafeId);

  console.log("this is shopclerks");
  console.log(shopClerks);
  // Step 2 & 3: Iterate over filtered users and send data through their socketId
  shopClerks.forEach((user) => {
    const socketId = user[2]; // Get the socketId from the user data
    console.log(
      `Sending data to user with socketId ${socketId} with data ${data}`
    );
    io.to(socketId).emit(event, data || {});
  });

  const payload = JSON.stringify({
    title: "New Transaction",
    body: "You have a new transaction!",
    cafeId: data.cafeId,
    transactionId: data.transactionId, // Include your transaction ID here
  });

  const ownerId = await Cafe.findOne({
    where: { cafeId: cafeId },
    attributes: ['ownerId'] // Only fetch itemId and name
  });
  console.log(ownerId.dataValues.ownerId )
  if(ownerId.dataValues.ownerId != null) sendNotifications(ownerId.dataValues.ownerId, payload);

  const users = await User.findAll({
    where: { cafeId: cafeId },
  });
  const c = Math.random();
  users.forEach((user) => {
    console.log(c);
    sendNotifications(user.userId, payload);
  });
}

function sendMessageToSocket(socketId, event, data) {
  if (data !== undefined && data !== null) {
    // Emit with data if provided
    io.to(socketId).emit(event, data || {});
  }
}

function logUnloggedUserSocket(userId, socketId) {
  userList.push([userId, 3, socketId, null]);
  console.log(userList);
}

function sendNotifToUserId(userId, payload) {
  sendNotifications(userId, payload);
}
function sendMessageToUser(userId, event, data) {
  // Find the user entry in the userList
  const user = userList.find((entry) => entry[0] === userId);

  if (user) {
    const socketId = user[2]; // Get the socketId from the user data

    if (socketId) {
      console.log("Sending message to " + socketId);
      // Send the message to the socketId, include data if it exists
      io.to(socketId).emit(event, data || {}); // Send an empty object if no data is provided
      console.log(`Message sent to user ${userId} via socketId ${socketId}`);
    } else {
      console.log(`No socketId found for user ${userId}`);
    }
  } else {
    console.log(`User with userId ${userId} not found`);
  }
}

// Function to get session by guest side sessionId
function getSessionByGuestSideSessionId(sessionId) {
  return guestSideList.find((session) => session[3] === sessionId);
}

// Function to verify guest side session and return its data
async function verifyGuestSideSession(sessionCode) {
  const session = guestSideList.find((session) => session[3] === sessionCode);
  console.log(session);
  if (session) return session;
  else return null;
}

async function updateSocketGuestSide(sessionCode, newSocketId) {
  const session = await verifyGuestSideSession(sessionCode);

  if (session) {
    const user = await User.findByPk(session[0]);
    if (user) {
      console.log(user);
      session[2] = newSocketId;
      session[4] = user.username;
      console.log("updating guest side socket");

      return session
        ? {
            clerkId: session[0],
            clerkSocketId: session[1],
            guestSideSocketId: session[2],
            sessionId: session[3],
            clerkUsername: session[4],
            shopId: user.cafeId,
          }
        : null;
    }

    return null;
  } else return null;
}

// Function to get all sessions by clerkId
function getSessionsByClerkId(clerkId) {
  return guestSideList.filter((session) => session[0] === clerkId);
}

// Export all functions and variables
module.exports = {
  storeQRCode,
  getQRCodeBySocketId,
  deleteQRCodeBySocketId,
  getSocketIdAndShopIdByQRCode,
  createGuestSideSession,
  getGuestSideSessions,
  deleteGuestSideSessionBySocketId,
  deleteGuestSideSessionByGuestSideSessionId, // Export the new function
  updateGuestSideSocketId,
  updateUserSocketId,
  logUnloggedUserSocket,
  sendNotifToUserId,
  sendMessageToUser,
  getAllClerk,
  sendMessageToSocket,
  sendMessageToAllClerk,
  getSessionByGuestSideSessionId,
  verifyGuestSideSession,
  updateSocketGuestSide,
  getSessionsByClerkId,
  qrCodeSocketMap, // Export for testing or debugging purposes if needed
  guestSideList, // Export for testing or debugging purposes if needed
};
