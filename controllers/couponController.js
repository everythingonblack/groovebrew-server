const { Coupon, User } = require("../models");
const bcrypt = require('bcrypt');  // For password hashing
const { Op } = require("sequelize");
const { generateToken } = require("../services/jwtHelper"); // Import the JWT helper


const CryptoJS = require('crypto-js');

function generateCouponCode(length = 8) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ023456789abdghmqrsuwz';
  let couponCode = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    couponCode += characters[randomIndex];
  }
  return couponCode;
}

const fetch = require('node-fetch'); // Ensure you have node-fetch installed if using fetch

exports.createCoupon = async (req, res) => {
  try {
    // Destructure required fields from the request body
    const { couponCodeExpect, discountType, discountValue, discountPeriods, expirationDate } = req.body;

    // Check for missing required fields
    if (!discountValue || !discountPeriods) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Function to generate a unique coupon code
    const generateUniqueCouponCode = async () => {
      let couponCode = generateCouponCode(); // Assuming generateCouponCode() is defined elsewhere
      let existingCoupon = await Coupon.findOne({ where: { code: couponCode } });

      // Keep generating new codes until it's unique
      while (existingCoupon) {
        couponCode = generateCouponCode();
        existingCoupon = await Coupon.findOne({ where: { code: couponCode } });
      }

      return couponCode;
    };
    let couponCode;
    // Generate a unique coupon code
    if (couponCodeExpect == undefined || couponCodeExpect == '') couponCode = await generateUniqueCouponCode();
    else {
      let existingCoupon = await Coupon.findOne({ where: { code: couponCodeExpect } });
      if (existingCoupon) return res.status(409).json({ message: "coupon code exist" });
      couponCode = couponCodeExpect;
    }

    // You can replace fetch with a more appropriate async task
    // If you need to do something with the HTML (for example, fetch a preview)
    try {
      const res =  await fetch(`https://dev.coupon.kedaimaster.com/coupon?couponCode=${couponCode}&discountType=${discountType}&discountValue=${discountValue}&expirationDate=${expirationDate}&discountPeriods=${discountPeriods}`, {
        method: 'POST',  // Specify that this is a POST request
        headers: {
          'Content-Type': 'application/json',  // Indicate that we're sending JSON
        },
      });

      if (!res.ok) {
        // throw new Error('Failed to fetch coupon HTML');
      }
    } catch (err) {
      console.error('Error fetching coupon HTML:', err);
    }


    // Create the new coupon record in the database
    const newCoupon = await Coupon.create({
      code: couponCode,
      discountType: discountType || "percentage",  // Default to "percentage" if not provided
      discountValue,
      discountPeriods,
    });

    // Respond with a success message and the new coupon object
    return res.status(201).json({
      message: "Coupon created successfully",
      coupon: newCoupon,
    });

  } catch (error) {
    // Log error and respond with internal server error
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
    console.log('Received Coupon Code:', couponCode);
    
    const secretKey = 'xixixi666'; // 32 characters for AES-256

    // Decrypt the couponCode
    const decryptedBytes = CryptoJS.AES.decrypt(couponCode, secretKey);
    const decryptedCode = decryptedBytes.toString(CryptoJS.enc.Utf8);


    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    // Find the coupon by its code
    const coupon = await Coupon.findOne({ where: { code: decryptedCode } });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon code is invalid" });
    }
    console.log(coupon)
    // Check if the coupon has already been used
    if (coupon.userId) {
      return res.status(400).json({ message: "Coupon has already been used" });
    }

    // Hash the user's password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId: 1,  // Assuming 1 is the default role for a new user
    });

    // Calculate the discount end date based on the coupon's discount periods
    const discountEndDate = new Date();
    discountEndDate.setUTCDate(discountEndDate.getUTCDate() + 7 * coupon.discountPeriods);

    // Log the current date and calculated discount end date for debugging
    console.log("Current Time:", new Date());
    console.log("Calculated discountEndDate:", discountEndDate);

    // Ensure that the discountEndDate is in the future
    if (discountEndDate <= new Date()) {
      console.log("Error: discountEndDate must be after the current date.");
      // You may decide to handle this case by adjusting the date, or setting a default value
      // For now, let's throw an error:
      return res.status(400).json({ message: "Invalid discount end date." });
    }

    // Update the coupon with the userId and discountEndDate
    await coupon.update({
      discountEndDate: discountEndDate,  // Set the discount end date
      userId: newUser.dataValues.userId,  // Associate the coupon with the new user
    });

    // Optionally post something to an external service (e.g., your coupon URL)
    try {
      fetch(`https://dev.coupon.kedaimaster.com/coupon?couponCode=${decryptedCode}`, {
        method: 'DELETE',  // Specify that this is a POST request
        headers: {
          'Content-Type': 'application/json',  // Indicate that we're sending JSON
        },
      });
    } catch (err) {
      console.error('Error fetching coupon HTML:', err);
    }


    // Generate JWT token for the new user
    const token = generateToken(newUser); // Assuming generateToken is a valid function

    // Respond with the token and necessary user details
    return res.status(200).json({ token, userId: newUser.id });

  } catch (error) {
    console.error('Error creating user with coupon:', error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getUserCoupons = async (req, res) => {
  try {
    const { userId } = req.user; // Assuming req.user contains the correct userId

    const coupons = await Coupon.findAll({
      where: {
        userId,
      },
      order: [
        ['discountEndDate', 'ASC'], // Order by discountEndDate, oldest first
      ],
    });

    if (!coupons || coupons.length === 0) {
      return res.status(404).json({ message: "Coupon not found or expired" });
    }

    return res.status(200).json({ message: "Coupons retrieved successfully", coupons });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.logCouponToUser = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const { userId } = req.user;  // Get the user ID from the authenticated user

    const coupon = await Coupon.findOne({ where: { code: couponCode } });

    if (!coupon) {
      return res.status(404).json({ message: "Coupon code is invalid" });
    }

    // Check if the coupon has already been used
    if (coupon.userId) {
      return res.status(400).json({ message: "Coupon has already been used" });
    }

    // Get all active coupons for the user
    const activeCoupons = await Coupon.findAll({
      where: {
        userId,
        discountEndDate: { [Op.gt]: new Date() }, // Only active coupons
      },
      order: [['discountEndDate', 'DESC']], // Get the most recent active coupon
    });

    let discountEndDate;

    if (activeCoupons.length > 0) {
      // If the user has an active coupon, use the discountEndDate of the most recent coupon
      const latestCoupon = activeCoupons[0]; // The most recent active coupon

      // Calculate the new discountEndDate based on the latest active coupon
      discountEndDate = new Date(latestCoupon.discountEndDate);
      discountEndDate.setUTCDate(discountEndDate.getUTCDate() + 7 * coupon.discountPeriods);

      console.log("Latest active coupon end date:", latestCoupon.discountEndDate);
      console.log("Calculated new discountEndDate based on latest coupon:", discountEndDate);
    } else {
      // If the user has no active coupons, calculate from the current date
      discountEndDate = new Date();
      discountEndDate.setUTCDate(discountEndDate.getUTCDate() + 7 * coupon.discountPeriods);

      console.log("No active coupon found. Setting discountEndDate from current date:", discountEndDate);
    }

    // Update the coupon with the new discountEndDate and link it to the user
    await coupon.update({
      discountEndDate: discountEndDate,  // Pass as a valid Date object
      userId: req.user.userId,
    });

    // Optionally post something to an external service (e.g., your coupon URL)
    try {
      fetch(`https://dev.coupon.kedaimaster.com/coupon?couponCode=${couponCode}`, {
        method: 'DELETE',  // Specify that this is a POST request
        headers: {
          'Content-Type': 'application/json',  // Indicate that we're sending JSON
        },
      });
    } catch (err) {
      console.error('Error fetching coupon HTML:', err);
    }


    return res.status(200).json({ message: "Coupon successfully logged to user", coupon });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
