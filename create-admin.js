require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/admin-models'); // path to Admin model
const connectDB = require('./config/mongoose');

// Connect to MongoDB
connectDB();

// Admin credentials – set your email and password here
const adminEmail = "btgaragedubai@yahoo.com"; // admin email
const adminPassword = "Btw@35205"; // admin password
const adminName = "Admin"; // admin name

async function createOrUpdateAdmin() {
    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Update existing admin or create a new one
        const result = await Admin.findOneAndUpdate(
            { email: adminEmail },
            { name: adminName, email: adminEmail, password: hashedPassword },
            { upsert: true, new: true }
        );

        console.log(`Admin ready with email: ${result.email} and password: ${adminPassword}`);
        process.exit(0);
    } catch (err) {
        console.error("Error creating/updating admin:", err);
        process.exit(1);
    }
}

createOrUpdateAdmin();
