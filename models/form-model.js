const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    message: { type: String },
  },
  { timestamps: true } 
);

module.exports = mongoose.model("Form", formSchema);
