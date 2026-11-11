const User = require("../models/User.js");
const validateBalance = require("../middleware/validateBalance.js");

//@desc     Update user account (deposit, withdraw, transfer, bill payment)
//@route    PUT /api/v1/transactions/:id
//@access   Private
exports.updateAccount = async (req, res, next) => {
  try {
    const date = new Date();
    let user = req.user;

    // Apply balance validation
    if (req.body.action == "deposit") {
      user.balance = user.balance + req.body.balance;
      user.transactions.push({
        title: req.body.action,
        target: "",
        amount: req.body.balance,
        balance: user.balance,
        date: date,
      });
      await User.findByIdAndUpdate(user.id, user);
    }

    if (req.body.action == "withdraw") {
      if (user.balance < req.body.balance) {
        return res.status(400).json({ success: false, status: 400, msg: "Insufficient balance to complete the withdrawal. Please check your balance and try again." });
      }
      user.balance = user.balance - req.body.balance;
      user.transactions.push({
        title: req.body.action,
        target: "",
        amount: req.body.balance,
        balance: user.balance,
        date: date,
      });
      await User.findByIdAndUpdate(user.id, user);
    }

    if (req.body.action == "transfer") {
      if (user.balance < req.body.balance) {
        return res.status(400).json({ success: false, status: 400, msg: "Your balance is not enough to complete the transfer. Please try a lower amount." });
      }

      const targetUser = await User.findOne({ accountId: req.body.target });
      if (!targetUser) {
        return res.status(400).json({ success: false, status: 400, msg: "We couldn't find the recipient's account. Please double-check the account ID." });
      }
      if (user.accountId === req.body.target) {
        return res.status(400).json({ success: false, status: 400, msg: "You cannot transfer to your own account." });
      }

      user.balance = user.balance - req.body.balance;
      user.transactions.push({
        title: req.body.action + ' to',
        target: targetUser.accountId,
        amount: req.body.balance,
        balance: user.balance,
        date: date,
      });
      await User.findByIdAndUpdate(user.id, user);

      targetUser.balance = targetUser.balance + req.body.balance;
      targetUser.transactions.push({
        title: req.body.action + ' from',
        target: user.accountId,
        amount: req.body.balance,
        balance: targetUser.balance,
        date: date,
      });
      await User.findByIdAndUpdate(targetUser.id, targetUser);
    }

    if (req.body.action == 'billpayment') {
      if (user.balance < req.body.balance) {
        return res.status(400).json({ success: false, status: 400, msg: "Your balance is not enough to complete the bill payment. Please try a lower amount." });
      }

      user.balance = user.balance - req.body.balance;
      user.transactions.push({
        title: req.body.action,
        target: req.body.target,
        amount: req.body.balance,
        balance: user.balance,
        date: date,
      });
      await User.findByIdAndUpdate(user.id, user);
    }

    return res.status(200).json({
      success: true,
      data: user,
      msg: `Your ${req.body.action} was successful!`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, status: 500, msg: "There was a problem processing your request. Please try again later." });
  }
};

//@desc     Get single account by accountId
//@route    GET /api/v1/transactions/:id
//@access   Public
exports.getAccount = async (req, res, next) => {
  try {
    // Find user by accountId
    const user = await User.findOne({ accountId: req.params.id });

    // If no user is found
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        msg: 'User not found. Please check the account ID and try again.',
      });
    }

    // Return user details if found
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        accountId: user.accountId,
        name: user.name,
        balance: user.balance,
      },
    });
  } catch (err) {
    // Log the error for debugging
    console.error(`Error fetching account with ID ${req.params.id}: ${err.message}`);

    // Return a server error message
    return res.status(500).json({
      success: false,
      status: 500,
      msg: 'There was a problem processing your request. Please try again later.',
    });
  }
};


//@desc     Get current logged-in user's account
//@route    GET /api/v1/transactions/me
//@access   Private
exports.getMyAccount = async (req, res, next) => {
  try {
    const user = req.user;

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        msg: "User not found. Please ensure you're logged in.",
      });
    }

    // Return user account details
    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        accountId: user.accountId,
        name: user.name,
        balance: user.balance,
        transactions: user.transactions || [], // Ensure transactions is at least an empty array
      },
    });
  } catch (err) {
    // Handle any server errors
    return res.status(500).json({
      success: false,
      status: 500,
      msg: "An error occurred while processing your request. Please try again later.",
    });
  }
};
