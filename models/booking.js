const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    country: String,
    emirate: String,
    phone: { type: String, required: true },

    drivingLicense: String,
    idDocument: String,

    pickupDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    deliveryLocation: String,
    returnLocation: String,

    subtotal: Number,
    vat: Number,
    total: { type: Number, required: true },

    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
