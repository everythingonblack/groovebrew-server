const { Coupon, User } = require("../models"); 
const bcrypt = require('bcrypt');  // For password hashing
const { Op } = require("sequelize");
const { generateToken } = require("../services/jwtHelper"); // Import the JWT helper

function generateCouponCode(length = 7) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&-'; 
    let couponCode = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      couponCode += characters[randomIndex];
    }
    return couponCode;
}

exports.createCoupon = async (req, res) => {
  try {
    const { discountType, discountValue, discountPeriods } = req.body;

    if (!discountValue || !discountPeriods) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    let couponCode = generateCouponCode();
    let existingCoupon = await Coupon.findOne({ where: { code: couponCode } });
    while (existingCoupon) {
      couponCode = generateCouponCode();
      existingCoupon = await Coupon.findOne({ where: { code: couponCode } });
    }

    const newCoupon = await Coupon.create({
      code: couponCode,
      discountType: discountType || "percentage",  
      discountValue,
      discountPeriods,
    });

    return res.status(201).json({
      message: "Coupon created successfully",
      coupon: newCoupon,
    });
  } catch (error) {
    console.error(error.message);  // Log the error message
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.checkCoupon = async (req, res) => {
  try {
    const { code } = req.params;

    const coupon = await Coupon.findOne({
      where: {
        code,  // The code must match the requested coupon
        expirationDate: {
          [Op.is]: null  // Check that the expirationDate is null (i.e., no expiration)
        }
      },
    });

    if (!coupon || coupon.userId) {
      return res.status(404).json({ message: "Coupon not found or expired" });
    }

    return res.status(200).json({ message: "Coupon is valid", coupon });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.createUserWithCoupon = async (req, res) => {
  try {
    const { username, email, password, couponCode } = req.body;
    console.log(couponCode)
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const coupon = await Coupon.findOne({ where: { code: couponCode } });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon code is invalid" });
    }

    // Check if the coupon has already been used
    if (coupon.userId) {
      return res.status(400).json({ message: "Coupon has already been used" });
    }

    // Hash the password before saving the user
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,  
      roleId: 1
    });
    
    const discountEndDate = new Date();
    discountEndDate.setUTCDate(discountEndDate.getUTCDate() + 7 * coupon.discountPeriods);
    
    // Log the current date and discountEndDate for debugging
    console.log("Current Time:", new Date());
    console.log("Calculated discountEndDate:", discountEndDate);
    
    // Ensure that discountEndDate is after the current time
    if (discountEndDate <= new Date()) {
      console.log("Error: discountEndDate must be after the current date.");
      // Handle this case: you may throw an error, set a default value, or adjust the date
    } else {
      console.log(newUser.dataValues.userId);
      
      await coupon.update({
        discountEndDate: discountEndDate,  // Pass as a valid Date object
        userId: newUser.dataValues.userId
      });
    }
    
    // Generate JWT token
    const token = generateToken(newUser);

    // Respond with the token and any necessary user details
    res.status(200).json({ token });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
