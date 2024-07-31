const { User, Cafe, Session } = require("../models");
const bcrypt = require("bcrypt");
const checkAvailability = require("../middlewares/checkAvailability");

// Helper functions
const generateRandomString = () => Math.random().toString(36).substring(2, 8);
const generateUniqueUsername = async () => {
  let username;
  let isUsernameAvailable = false;
  while (!isUsernameAvailable) {
    username = "guest_" + generateRandomString();
    const existingUser = await User.findOne({ where: { username } });
    isUsernameAvailable = !existingUser;
  }
  return username;
};

const generateToken = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Controller to create an admin user
exports.createAdmin = async (req, res) => {
  const { username, password, email } = req.body;
  try {
    const availability = await checkAvailability(username, email);
    if (availability.status === 400)
      return res.status(400).json({ error: availability.message });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId: 1,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to create a clerk user
exports.createClerk = async (req, res) => {
  const { cafeId } = req.params;
  const { username, email, password } = req.body;
  try {
    const cafe = await Cafe.findOne({
      where: { cafeId, ownerId: req.user.userId },
    });
    if (!cafe) return res.status(403).json({ error: "Unauthorized" });

    const availability = await checkAvailability(username, email);
    if (availability.status === 400)
      return res.status(400).json({ error: availability.message });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId: 2,
      cafeId,
    });

    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating clerk:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to create a guest user
exports.createGuest = async (req, res) => {
  try {
    const username = await generateUniqueUsername();
    const email = `${username}@g.g`;
    const hashedPassword = await bcrypt.hash(generateRandomString(), 10);

    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      roleId: 3,
    });
    const token = generateToken();
    await Session.create({ userId: user.userId, token });

    res.status(201).json({ token });
  } catch (error) {
    console.error("Error creating guest user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to update a user
exports.updateUser = async (req, res) => {
  const { email, username, password } = req.body;
  console.log(email, username, password);
  try {
    if (username.startsWith("guest")) {
      return res
        .status(400)
        .json({ error: 'Username cannot start with "guest"' });
    }

    // Check if email or username is already in use
    const existingUserWithEmail = await User.findOne({ where: { email } });
    if (
      existingUserWithEmail &&
      existingUserWithEmail.userId !== req.user.userId
    ) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    const existingUserWithUsername = await User.findOne({
      where: { username },
    });
    if (
      existingUserWithUsername &&
      existingUserWithUsername.userId !== req.user.userId
    ) {
      return res.status(400).json({ error: "Username is already in use" });
    }

    if (password.length < 16) {
      return res.status(400).json({ error: "Password is too short" });
    }

    // Update user data
    req.user.email = email;
    req.user.username = username;
    req.user.password = await bcrypt.hash(password, 10);
    await req.user.save();

    res.status(200).json(req.user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to get the list of admin users
exports.getAdminList = async (req, res) => {
  try {
    const adminUsers = await User.findAll({ where: { roleId: 1 } });
    res.status(200).json(adminUsers);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Controller to get clerks by cafe ID
exports.getClerkByCafeId = async (req, res) => {
  const { cafeId } = req.params;
  try {
    const clerks = await User.findAll({ where: { cafeId } });
    res.status(200).json(clerks);
  } catch (error) {
    console.error("Error fetching clerks:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
