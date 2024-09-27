// server/notificationSender.js
const webPush = require("web-push");

// Store subscriptions by user ID
const subscriptions = {};

const addSubscription = (userId, subscription) => {
  if (!subscriptions[userId]) {
    subscriptions[userId] = [];
  }
  subscriptions[userId].push(subscription);
  console.log(subscriptions);
};

const sendNotificationsToUser = (userId, transactionId) => {
  if (!subscriptions[userId]) return;

  const payload = JSON.stringify({
    title: "New Transaction Alert",
    body: `Transaction ID: ${transactionId}`,
  });

  subscriptions[userId].forEach((subscription) => {
    webPush
      .sendNotification(subscription, payload)
      .catch((err) =>
        console.error(`Error sending notification to user ${userId}:`, err)
      );
  });
};

module.exports = { addSubscription, sendNotificationsToUser };
