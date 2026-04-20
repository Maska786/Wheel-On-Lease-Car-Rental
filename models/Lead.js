const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    carId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    source: { type: String, default: "Fleet Rent Now Modal" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Lead", leadSchema);
