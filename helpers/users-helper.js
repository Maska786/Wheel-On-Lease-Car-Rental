const User = require('../models/user-models');
const bcrypt = require('bcrypt');

const usersHelper = {
    doSignup: async (userData) => {
        try {
            const existingUser = await User.findOne({ email: userData.email });
            if (existingUser) {
                return { status: false, message: 'Email already registered.' };
            }
            const newUser = new User({
                name: userData.name,
                email: userData.email,
                password: userData.password,
            });
            await newUser.save();
            return { status: true, user: newUser };
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    },

    doLogin: async (userData) => {
        try {
            const user = await User.findOne({ email: userData.email });
            if (!user) {
                return { status: false, message: 'Invalid email or password' };
            }
            const isMatch = await bcrypt.compare(userData.password, user.password);
            if (!isMatch) {
                return { status: false, message: 'Invalid email or password' };
            }
            return { status: true, user };
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

};

module.exports = usersHelper;