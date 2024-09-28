// services/subscriptionService.js
let subscriptions = []; // For storing subscriptions

const addSubscription = (subscription) => {
  subscriptions.push(subscription);
  console.log("Subscription added:", subscription);
};

const getSubscriptions = () => {
  return subscriptions;
};

module.exports = {
  addSubscription,
  getSubscriptions,
};
