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

const sendNotifications = (payload) => {
  const subscriptions = subscriptionService.getSubscriptions();
  subscriptions.forEach((subscription) => {
    try {
      sendNotification(subscription, payload);
    } catch {}
  });
};

module.exports = {
  sendNotifications,
};
