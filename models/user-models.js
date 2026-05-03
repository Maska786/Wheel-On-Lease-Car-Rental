const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // optional for OAuth users
    authProvider: { type: String, default: 'local' },
    googleId: { type: String },
    facebookId: { type: String },
    isAdmin: { type: Boolean, default: false }
});

// Auto-hash password before saving (only if present)
userSchema.pre('save', async function(next) {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
