const { User } = require("../models");

async function checkAvailability(username, email) {
  if (username !== null) {
    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      return {
        status: 400,
        message: "Username already taken",
      };
    }
  }

  if (email != undefined && email !== null) {
    const existingEmail = await User.findOne({ where: { email } });

    if (existingEmail) {
      return {
        status: 400,
        message: "Email already taken",
      };
    }
  }

  return { message: "Username and email available" };
}

module.exports = checkAvailability;
