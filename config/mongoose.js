const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/carRental';

    // Connect without deprecated options
    await mongoose.connect(mongoURI); // No need for useNewUrlParser or useUnifiedTopology
    console.log("Mongoose connected to MongoDB");
  } catch (err) {
    console.error("Mongoose connection error:", err);
  }
};

module.exports = connectDB;
