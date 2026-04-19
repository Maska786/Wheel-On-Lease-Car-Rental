const express = require("express");
const router = express.Router();
const productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/users-helper");
const Product = require("../models/product-models");
const Booking = require("../models/booking");
const Form = require("../models/form-model");



// LOGIN CHECK MIDDLEWARE
const verifyUser = (req, res, next) => {
  if (req.session.user) return next();
  req.session.loginRedirect = req.originalUrl;
  return res.redirect("/login");
};

// ---------------- PUBLIC ROUTES ----------------
router.get("/", (req, res) => {
  res.render("index", {
    title: "Home Page",
    user: req.session.user,
    admin: req.session.admin,
  });
});

router.get("/about", (req, res) => {
  res.render("about", {
    title: "About Us",
    user: req.session.user,
    admin: req.session.admin,
  });
});

router.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact Us",
    user: req.session.user,
    admin: req.session.admin,
  });
});

// ---------------- GET / SUBMIT FORM ----------------
router.get("/form", (req, res) => {
  res.render("users/form", {
    title: "Contact Form",
    user: req.session.user,
    admin: req.session.admin,
    success: req.session.success,
    error: req.session.error,
  });
  req.session.success = null;
  req.session.error = null;
});

router.post("/form", async (req, res) => { 
  try {
    const { firstName, lastName, phoneNumber, email, message } = req.body;

    if (!firstName || !lastName || !phoneNumber || !email) {
      req.session.error = "All required fields must be filled.";
      return res.redirect("/form");
    }

    const formData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim().toLowerCase(),
      message: message ? message.trim() : "",
    };

    const existing = await Form.findOne({
      $or: [
        { email: formData.email },
        { phoneNumber: formData.phoneNumber }
      ],
    });

    if (existing) {
      req.session.error = "Email or Phone Number already exists.";
      return res.redirect("/form");
    }

    await new Form(formData).save();
    req.session.success = "Thank you, we’ll contact you soon!";
    return res.redirect("/form");
  } catch (err) {
    console.error("Form submission error:", err);
    req.session.error = "Something went wrong. Please try again later.";
    return res.redirect("/form");
  }
});

// ---------------- LOGIN / SIGNUP ROUTES ----------------
router.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("users/login", { title: "Login", loginError: req.session.loginError });
  req.session.loginError = null;
});

router.post("/login", async (req, res) => {
  try {
    const response = await userHelpers.doLogin(req.body);
    if (response.status) {
      req.session.user = response.user;
      const redirectUrl = req.session.loginRedirect || "/";
      req.session.loginRedirect = null;
      return res.redirect(redirectUrl);
    } else {
      req.session.loginError = response.message;
      return res.redirect("/login");
    }
  } catch (err) {
    console.error(err);
    req.session.loginError = "Something went wrong";
    res.redirect("/login");
  }
});

router.get("/signup", (req, res) => {
  res.render("users/signup", { title: "Sign Up", signupError: req.session.signupError });
  req.session.signupError = null;
});

router.post("/signup", async (req, res) => {
  if (req.body.password !== req.body.repeatPassword) {
    req.session.signupError = "Passwords do not match";
    return res.redirect("/signup");
  }

  try {
    const response = await userHelpers.doSignup(req.body);
    if (response.status) return res.redirect("/login");
    req.session.signupError = response.message;
    res.redirect("/signup");
  } catch (err) {
    console.error(err);
    req.session.signupError = "Something went wrong";
    res.redirect("/signup");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ---------------- FLEET ROUTE ----------------
router.get("/fleet", async (req, res) => {
  try {
    const suvProducts = await productHelpers.getByCategory("SUV");
    const sedanProducts = await productHelpers.getByCategory("Sedan");

    res.render("fleet", {
      title: "Our Fleet",
      suvProducts,
      sedanProducts,
      user: req.session.user,
      admin: req.session.admin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading fleet");
  }
});

// ---------------- BOOKING ROUTES ----------------
router.get("/booking/:carId", verifyUser, async (req, res) => {
  try {
    const car = await productHelpers.getProductDetails(req.params.carId);
    res.render("users/rent-now", {
      title: `Book ${car.carName}`,
      car,
      user: req.session.user,
      admin: req.session.admin,
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY // send to template
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading booking page");
  }
});

// Stripe Checkout session
router.post("/create-checkout-session", verifyUser, async (req, res) => {
  try {
    const { amount, carId, pickupDate, returnDate } = req.body;
    if (!amount || !carId || !pickupDate || !returnDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "aed",
          product_data: {
            name: `Car Rental Booking`,
          },
          unit_amount: Math.round(amount * 100), // convert AED to fils
        },
        quantity: 1,
      }],
      metadata: {
        userId: req.session.user._id.toString(),
        carId,
        pickupDate,
        returnDate,
      },
      success_url: `${req.protocol}://${req.get("host")}/my-bookings?success=true`,
      cancel_url: `${req.protocol}://${req.get("host")}/booking/${carId}`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ error: "Stripe session creation failed" });
  }
});

router.post("/booking/:carId", verifyUser, async (req, res) => {
  try {
    const { pickupDate, returnDate } = req.body;
    const booking = new Booking({
      user: req.session.user._id,
      car: req.params.carId,
      pickupDate,
      returnDate,
      status: "Pending",
    });

    await booking.save();
    res.redirect("/my-bookings");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating booking");
  }
});

router.get("/my-bookings", verifyUser, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.session.user._id })
      .populate("car")
      .lean();

    res.render("users/my-bookings", {
      title: "My Bookings",
      bookings,
      user: req.session.user,
      admin: req.session.admin,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading bookings");
  }
});

module.exports = router;
