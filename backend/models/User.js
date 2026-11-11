const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please enter your name"],
  },

  accountId: {
    type: String,
    required: [true, "Please enter your account ID"],
    unique: [true, "This account ID is already in use. Please choose another."], // Unique case
    validate: [
      {
        validator: function (v) {
          return /^\d+$/.test(v); // Numbers only
        },
        message: "Your account ID should contain numbers only",
      },
      {
        validator: function (v) {
          return v.length === 10; // Exactly 10 digits
        },
        message: "Your account ID must be exactly 10 digits long",
      },
    ],
  },

  balance: {
    type: Number,
    default: 0,
  },
  transactions: [
    {
      title: String,
      target: String,
      amount: Number, // Fixed typo from 'among' to 'amount'
      balance: Number,
      date: Date,
    },
  ],
  password: {
    type: String,
    required: [true, "Please create a password"],
    select: false,
    validate: [
      {
        validator: function (v) {
          return /^\d+$/.test(v); // Ensure it's only numbers
        },
        message: "Your password should contain numbers only",
      },
      {
        validator: function (v) {
          return v.length === 4; // Ensure it's exactly 4 digits
        },
        message: "Your password must be exactly 4 digits long",
      },
    ],
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }

  // Validate before hashing (number-only and 4 digits)
  if (!/^\d{4}$/.test(this.password)) {
    throw new Error("Password should be 4 digits and contain numbers only");
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
