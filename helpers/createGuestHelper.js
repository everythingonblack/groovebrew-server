const { User } = require('../models'); // Adjust the path to your User model

const generateUniqueUsername = async () => {
  let username;
  let exists = true;

  while (exists) {
    const randomNumber = Math.floor(Math.random() * 10000);
    username = `guest${randomNumber}`;

    const existingUser = await User.findOne({ where: { username } });
    if (!existingUser) {
      exists = false;
    }
  }

  return username;
};

module.exports = {
  generateUniqueUsername,
};