const { User, Session } = require("../models");
// services/subscriptionService.js
let subscriptions = {}; // Map of userId to an array of subscriptions

const addSubscription = async (subscription, token) => {
  const session = await Session.findOne({
    where: { token, isValid: true },
    include: {
      model: User,
    },
  });

  if (session && session.User) {
    const userId = session.User.userId; // Extract userId from session
    if (!subscriptions[userId]) {
      subscriptions[userId] = []; // Initialize array if it doesn't exist
    }
    subscriptions[userId].push(subscription); // Add subscription to the array
    console.log("Subscription added for userId:", userId);
  } else {
    console.log("No valid session found for token:", token);
  }
};

const getSubscriptionsByUserId = (userId) => {
  return subscriptions[userId] || []; // Get subscriptions array by userId
};

module.exports = {
  addSubscription,
  getSubscriptionsByUserId,
};
