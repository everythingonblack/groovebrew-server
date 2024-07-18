// [this is guestSide socketId, this is the code for qr]
const qrCodeSocketMap = {};

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
  const socketId = Object.keys(qrCodeSocketMap).find((socketId) => qrCodeSocketMap[socketId][0] === qrCode);
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
  const index = guestSideList.findIndex(session => session[2] === socketId);
  if (index !== -1) {
    guestSideList.splice(index, 1);
  }
}

// Function to delete guest side session by guest side sessionId
function deleteGuestSideSessionByGuestSideSessionId(userId, sessionId) {
  const index = guestSideList.findIndex(session => session[3] === sessionId);
  if (index !== -1) {
    if(guestSideList[index][0] != userId) return false;
    const previousGuestSideSocket = guestSideList[index][2];
    guestSideList.splice(index, 1);

    return {guestSideList, previousGuestSideSocket};
  }
  else return false;
}

// Function to update guest side socketId by sessionCode
function updateGuestSideSocketId(sessionCode, newSocketId) {
  const session = guestSideList.find(session => session[3] === sessionCode);
  if (session) {
    session[2] = newSocketId;
    return true;
  }
  return false;
}

// Function to update clerk socketId by clerkId
function updateClerkSocketId(clerkId, newSocketId) {
  const session = guestSideList.find(session => session[0] === clerkId);
  if (session) {
    session[1] = newSocketId;
    return true;
  }
  return false;
}

// Function to get session by guest side sessionId
function getSessionByGuestSideSessionId(sessionId) {
  return guestSideList.find(session => session[3] === sessionId);
}

// Function to verify guest side session and return its data
function verifyGuestSideSession(sessionCode, newSocketId) {
  const session = guestSideList.find(session => session[3] === sessionCode);
  if(session){
    session[2] = newSocketId;
    console.log('updating guest side socket')
    return session ? {
      clerkId: session[0],
      clerkSocketId: session[1],
      guestSideSocketId: session[2],
      sessionId: session[3]
    } : null;
  }
}

// Function to get all sessions by clerkId
function getSessionsByClerkId(clerkId) {
  return guestSideList.filter(session => session[0] === clerkId);
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
  updateClerkSocketId,
  getSessionByGuestSideSessionId,
  verifyGuestSideSession,
  getSessionsByClerkId,
  qrCodeSocketMap, // Export for testing or debugging purposes if needed
  guestSideList, // Export for testing or debugging purposes if needed
};
