const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = (email, cafe, type, transactions, token) => {
  let subject, text;

  const transactionDetails = transactions.map(item => `- Item ID: ${item.itemId}, Quantity: ${item.qty}`).join('\n');

  switch (type) {
    case 'invite':
      subject = 'Invitation to Create an Account';
      text = `Hello,\n\nA transaction has been made on ${cafe.name} using this email:\n\n${transactionDetails}\n\nPlease create an account using the following link:\n\n${process.env.FRONTEND_URI}/${cafe.cafeId}?token=${token}\n\nBest regards,\nYour Company`;
      break;
    case 'completeRegistration':
      subject = 'Complete Your Registration';
      text = `Hello,\n\nA transaction has been made on ${cafe.name} using this email:\n\n${transactionDetails}\n\nPlease complete your registration using the following link:\n\n${process.env.FRONTEND_URI}/${cafe.cafeId}?token=${token}\n\nBest regards,\nYour Company`;
      break;
    case 'transactionNotification':
      subject = 'Transaction Notification';
      text = `Hello,\n\nA new transaction has been created on ${cafe.name} with the following details:\n\n${transactionDetails}\n\nPlease check your account for more details.\n\nBest regards,\nYour Company`;
      break;
    default:
      console.error('Invalid email type');
      return Promise.reject('Invalid email type');
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    text: text
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return reject(error);
      }
      console.log(`${type} email sent: ` + info.response);
      resolve(info);
    });
  });
};

module.exports = {
  sendEmail
};
