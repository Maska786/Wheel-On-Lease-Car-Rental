const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");

// Models
const Product = require("../models/product-models");
const Admin = require("../models/admin-models");
const User = require("../models/user-models");
const Booking = require("../models/booking");
const Form = require("../models/form-model");

// Services
const { sendOTP } = require("../utils/emailService");

// -------------------- Middleware --------------------
function isAdminLoggedIn(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.redirect("/admin/login");
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Debug all admin routes
router.all("*", (req, res, next) => {
  console.log("Admin route hit:", req.method, req.originalUrl);
  next();
});

// -------------------- Admin Auth --------------------
router.get("/login", (req, res) => {
  if (req.session.admin) return res.redirect("/admin/dashboard");
  res.render("admin/login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.render("admin/login", { error: "Invalid email or password" });

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) return res.render("admin/login", { error: "Invalid email or password" });

    req.session.admin = admin;
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

// -------------------- Forgot Password --------------------

router.get("/forgot-password", (req, res) => {
  res.render("admin/forgot-password");
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.render("admin/forgot-password", { error: "No administrative authority linked to that address." });

    // Generate 6 digit pin
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.resetOtp = otp;
    req.session.resetEmail = email; // store identity temporally

    await sendOTP(email, otp);
    res.redirect("/admin/verify-reset-otp");
  } catch (err) {
    res.render("admin/forgot-password", { error: "Internal error during generation." });
  }
});

router.get("/verify-reset-otp", (req, res) => {
    if (!req.session.resetEmail) return res.redirect('/admin/forgot-password');
    res.render("admin/verify-reset-otp", { email: req.session.resetEmail });
});

router.post("/verify-reset-otp", (req, res) => {
    const { otp } = req.body;
    if (req.session.resetOtp && req.session.resetOtp === otp) {
        req.session.resetVerified = true;
        res.redirect("/admin/reset-password");
    } else {
        res.render("admin/verify-reset-otp", { error: "Invalid Security Code. Connection refused.", email: req.session.resetEmail });
    }
});

router.get("/reset-password", (req, res) => {
    if (!req.session.resetVerified) return res.redirect("/admin/forgot-password");
    res.render("admin/reset-password");
});

router.post("/reset-password", async (req, res) => {
    if (!req.session.resetVerified || !req.session.resetEmail) return res.redirect("/admin/forgot-password");
    
    const { newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
        return res.render("admin/reset-password", { error: "Passwords fail strict parity check." });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Admin.findOneAndUpdate({ email: req.session.resetEmail }, { password: hashedPassword });
        
        // Wipe protocol fragments
        req.session.resetOtp = null;
        req.session.resetEmail = null;
        req.session.resetVerified = null;

        res.render("admin/login", { success: "Security restored! Please log in with new credentials." });
    } catch (err) {
        res.render("admin/reset-password", { error: "Cryptographic failure writing to DB." });
    }
});

// -------------------- Dashboard --------------------
router.get("/dashboard", isAdminLoggedIn, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalForms = await Form.countDocuments();

    res.render("admin/dashboard", {
      admin: req.session.admin,
      stats: { totalProducts, totalUsers, totalBookings, totalForms },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// -------------------- Product Routes --------------------
router.get("/view-products", isAdminLoggedIn, async (req, res) => {
  const products = await Product.find().lean();
  res.render("admin/view-products", { products, admin: req.session.admin });
});

router.get("/add-products", isAdminLoggedIn, (req, res) => {
  res.render("admin/add-products", { admin: req.session.admin });
});

router.post("/add-products", isAdminLoggedIn, upload.single("CarImage"), async (req, res) => {
  const { carName, carDescription, priceDaily, priceWeekly, priceMonthly, carCategory, altText } = req.body;
  await Product.create({
    carName,
    carDescription,
    priceDaily,
    priceWeekly,
    priceMonthly,
    carCategory,
    altText,
    image: req.file ? "/uploads/" + req.file.filename : null,
  });
  res.redirect("/admin/view-products");
});

router.get("/edit-product/:id", isAdminLoggedIn, async (req, res) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) return res.redirect("/admin/view-products");
  res.render("admin/edit-product", { product, admin: req.session.admin });
});

router.post("/edit-product/:id", isAdminLoggedIn, upload.single("CarImage"), async (req, res) => {
  try {
    const { carName, carDescription, priceDaily, priceWeekly, priceMonthly, carCategory, altText } = req.body;
    const updateData = { carName, carDescription, priceDaily, priceWeekly, priceMonthly, carCategory, altText };
    if (req.file) {
        updateData.image = "/uploads/" + req.file.filename;
    }
    await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.redirect("/admin/view-products");
  } catch (error) {
    console.error("Error editing product:", error);
    res.redirect("/admin/view-products");
  }
});

router.get("/delete-product/:id", isAdminLoggedIn, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect("/admin/view-products");
});

// -------------------- User Routes --------------------
router.get("/users", isAdminLoggedIn, async (req, res) => {
  const users = await User.find().lean();
  res.render("admin/users", { users, admin: req.session.admin });
});

// -------------------- Booking Routes --------------------
router.get("/bookings", isAdminLoggedIn, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user")
      .populate("car")
      .sort({ createdAt: -1 })
      .lean();

    res.render("admin/bookings", { bookings, admin: req.session.admin });
  } catch (err) {
    console.error("Error fetching bookings:", err);
    res.status(500).send("Error fetching bookings");
  }
});

router.get("/booking/:id", isAdminLoggedIn, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user")
      .populate("car")
      .lean();
    if (!booking) return res.redirect('/admin/bookings');
    res.render("admin/booking-details", { booking, admin: req.session.admin });
  } catch (err) {
    console.error("Error fetching booking details:", err);
    res.redirect("/admin/bookings");
  }
});

router.post("/update-booking-status/:id", isAdminLoggedIn, async (req, res) => {
  try {
    await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.redirect("/admin/bookings");
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.redirect("/admin/bookings");
  }
});

router.post("/delete-booking/:id", isAdminLoggedIn, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.redirect("/admin/bookings");
  } catch (err) {
    console.error("Error deleting booking:", err);
    res.redirect("/admin/bookings");
  }
});

// -------------------- Form Submissions --------------------

// List all forms
router.get("/forms", isAdminLoggedIn, async (req, res) => {
  try {
    const forms = await Form.find().sort({ createdAt: -1 }).lean();
    const formattedForms = forms.map((form, index) => ({
      ...form,
      indexPlusOne: index + 1,
      createdAtFormatted: new Date(form.createdAt).toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
    res.render("admin/forms-admin", { forms: formattedForms, admin: req.session.admin });
  } catch (err) {
    console.error("Error loading forms:", err);
    res.render("admin/forms-admin", { forms: [], admin: req.session.admin });
  }
});

// Delete a form
router.post("/delete-form/:id", isAdminLoggedIn, async (req, res) => {
  try {
    await Form.findByIdAndDelete(req.params.id);
    res.redirect("/admin/forms"); // redirect to list after deletion
  } catch (err) {
    console.error("Error deleting form:", err);
    res.status(500).send("Error deleting form");
  }
});

// -------------------- Password Management --------------------
router.get("/change-password", isAdminLoggedIn, (req, res) => {
  res.render("admin/change-password", { admin: req.session.admin });
});

// Internal Endpoint explicitly requesting OTP generation
router.post("/generate-otp", isAdminLoggedIn, async (req, res) => {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.session.internalOtp = otp;
        
        const success = await sendOTP(req.session.admin.email, otp);
        if (success) {
            res.json({ status: 'success', message: 'OTP transmitted' });
        } else {
            res.json({ status: 'error', message: 'Nodemailer configuration error.' });
        }
    } catch (err) {
        res.json({ status: 'error', message: 'Internal logic crash.' });
    }
});

router.post("/change-password", isAdminLoggedIn, async (req, res) => {
  const { otp, newPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.render("admin/change-password", { error: "New passwords do not match. Please try again.", admin: req.session.admin });
  }

  if (!req.session.internalOtp || req.session.internalOtp !== otp) {
    return res.render("admin/change-password", { error: "Invalid or expired Security Code. Protocol halted.", admin: req.session.admin });
  }

  try {
    const adminDoc = await Admin.findById(req.session.admin._id);
    if (!adminDoc) return res.redirect("/admin/login");

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    adminDoc.password = hashedPassword;
    await adminDoc.save();

    req.session.internalOtp = null; // Clear key
    res.render("admin/change-password", { success: "Security Protocol Updated: Configuration securely locked over OTP!", admin: req.session.admin });
  } catch (err) {
    console.error("Error changing password:", err);
    res.render("admin/change-password", { error: "An internal server error occurred while writing.", admin: req.session.admin });
  }
});

module.exports = router;
