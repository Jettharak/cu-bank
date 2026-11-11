const mongoose = require('mongoose');

const connectDB = async () => {
    // Check if MONGO_URI is declared
    if (!process.env.MONGO_URI) {
        console.error('Error: MONGO_URI is not defined in environment variables.');
        process.exit(1); // Exit the process with failure code
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error(`Error: ${err.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;
