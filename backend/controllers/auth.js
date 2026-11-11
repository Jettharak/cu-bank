const User = require('../models/User');
const { options } = require('../routes/transactions');

//@desc     Register user
//@route    POST /api/v1/auth/register
//@access   Public
exports.register = async (req, res, next) => {
    try {
        const { name, accountId, password } = req.body;

        // Validate name - length must not exceed 30 characters including spaces
        if (name.length > 30) {
            return res.status(400).json({ success: false, msg: "Your fullname must be 30 characters or less, including spaces." });
        }

        // Validate account ID - only numbers and exactly 10 digits
        if (!/^\d+$/.test(accountId)) {
            return res.status(400).json({ success: false, msg: "Your account ID should contain numbers only." });
        }
        if (accountId.length !== 10) {
            return res.status(400).json({ success: false, msg: "Your account ID must be exactly 10 digits long." });
        }

        // Validate password - only numbers and exactly 4 digits
        if (!/^\d+$/.test(password)) {
            return res.status(400).json({ success: false, msg: "Your password should contain numbers only." });
        }
        if (password.length !== 4) {
            return res.status(400).json({ success: false, msg: "Your password must be exactly 4 digits long." });
        }

        // Check if the account ID already exists
        const checkUser = await User.findOne({ accountId });
        if (checkUser) {
            return res.status(401).json({ success: false, msg: 'This account ID is already in use. Please use a different account ID.' });
        }

        // Create new user
        const user = await User.create({
            name, accountId, password
        });

        // Send token response
        sendTokenResponse(user, 200, res);

    } catch (err) {
        res.status(500).json({
            success: false,
            msg: 'Something went wrong on our side. Please try again later.'
        });
    }
};


//@desc     Login user
//@route    POST /api/v1/auth/login
//@access   Public
exports.login = async (req, res, next) => {
    try {
        const { accountId, password } = req.body;

        // Validate account ID - only numbers and exactly 10 digits
        if (!/^\d+$/.test(accountId)) {
            return res.status(400).json({ success: false, msg: "Your account ID should contain numbers only." });
        }
        if (accountId.length !== 10) {
            return res.status(400).json({ success: false, msg: "Your account ID must be exactly 10 digits long." });
        }

        // Validate password - only numbers and exactly 4 digits
        if (!/^\d+$/.test(password)) {
            return res.status(400).json({ success: false, msg: "Your password should contain numbers only." });
        }
        if (password.length !== 4) {
            return res.status(400).json({ success: false, msg: "Your password must be exactly 4 digits long." });
        }

        // Check for user
        const user = await User.findOne({ accountId }).select('+password');
        if (!user) {
            return res.status(400).json({ success: false, msg: 'User not found. Please check your account ID.' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, msg: 'Incorrect password. Please try again.' });
        }

        // Create token and send response
        sendTokenResponse(user, 200, res);

    } catch (err) {
        return res.status(500).json({
            success: false,
            msg: 'Server error. Please try again later.'
        });
    }
};


// Get token from model, create cookie, and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();

    const options = {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
        httpOnly: true
    };

    if (process.env.NODE_ENV === 'production') {
        options.secure = true;
    }

    return res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user
    });
};

//@desc     Get current Logged in user
//@route    POST /api/v1/auth/me
//@access   Private
exports.getMe=async(req,res,next)=>{
    const user=await User.findById(req.user.id);
    return res.status(200).json({
        success:true,
        data:user
    });
};

//@desc Log user out / clear cookie
//@route GET /api/v1/auth/logout
//@access Private
exports.logout=async(req,res,next)=>{
    res.cookie('token','none',{
        expires: new Date(Date.now() + 10*1000),
        httpOnly:true
    });

    return res.status(200).json({
        success:true,
        data:{}
    });
};