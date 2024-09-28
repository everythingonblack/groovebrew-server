// services/notificationService.js
const webpush = require("web-push");
const subscriptionService = require("./subscriptionService");

const sendNotification = (subscription, payload) => {
  webpush
    .sendNotification(subscription, payload)
    .then(() => {
      console.log("Notification sent successfully");
    })
    .catch((error) => {
      console.error("Error sending notification:", error);
    });
};

const sendNotifications = (userId, payload) => {
  const subscriptions = subscriptionService.getSubscriptionsByUserId(userId);
  subscriptions.forEach((subscription) => {
    try {
      sendNotification(subscription, payload);
    } catch (error) {
      console.error("Error during sending notification:", error);
    }
  });
};

module.exports = {
  sendNotifications,
};
