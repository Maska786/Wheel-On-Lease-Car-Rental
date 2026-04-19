const mongoose = require("mongoose");

const formSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    countryCode: { type: String, required: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    message: { type: String, trim: true }, // NEW field
  },
  { timestamps: true }
);

module.exports = mongoose.model("Form", formSchema);
