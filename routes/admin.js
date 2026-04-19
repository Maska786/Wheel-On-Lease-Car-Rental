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
  const { carName, carDescription, priceDaily, priceWeekly, priceMonthly, carCategory, altText } = req.body;
  const updateData = { carName, carDescription, priceDaily, priceWeekly, priceMonthly, carCategory, altText };
  if (req.file) updateData.image = "/uploads/" + req.file.filename;
  await Product.findByIdAndUpdate(req.params.id, updateData);
  res.redirect("/admin/view-products");
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

module.exports = router;
