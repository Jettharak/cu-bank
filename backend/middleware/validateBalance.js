// middlewares/validateBalance.js
const validateBalance = (req, res, next) => {
    // Validate that the balance is a number
    if (isNaN(req.body.balance)) {
      return res.status(400).json({
        success: false,
        status: 400,
        msg: "Invalid balance amount. Please enter a valid number.",
      });
    }
  
    // Validate that the balance is greater than 0
    if (req.body.balance <= 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        msg: "The balance amount must be greater than 0. Please enter a positive number.",
      });
    }
  
    // Validate that the balance has no decimals
    if (!Number.isInteger(req.body.balance)) {
      return res.status(400).json({
        success: false,
        status: 400,
        msg: "The balance amount must be a whole number with no decimals.",
      });
    }
  
    next(); // Proceed to the next middleware or route handler
  };
  
  module.exports = validateBalance;
  