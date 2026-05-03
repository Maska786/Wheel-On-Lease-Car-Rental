const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/user-models');

module.exports = function(passport) {
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    const siteUrl = process.env.BASE_URL || 'http://localhost:3000';

    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID || 'missing',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'missing',
        callbackURL: `${siteUrl}/auth/google/callback`
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase() : null;
            if (!email) return done(new Error("No email returned from Google"), null);

            // Check if user already exists
            let user = await User.findOne({ email });
            
            if (user) {
                // Link googleId if not already present
                if (!user.googleId) {
                    user.googleId = profile.id;
                    await user.save();
                }
                return done(null, user);
            } else {
                // Create new user
                const newUser = new User({
                    name: profile.displayName || profile.name.givenName,
                    email: email,
                    googleId: profile.id,
                    authProvider: 'google'
                });
                await newUser.save();
                return done(null, newUser);
            }
        } catch (err) {
            console.error('Google Auth Error:', err);
            return done(err, null);
        }
    }));

    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID || 'missing',
        clientSecret: process.env.FACEBOOK_APP_SECRET || 'missing',
        callbackURL: `${siteUrl}/auth/facebook/callback`,
        profileFields: ['id', 'displayName', 'emails', 'name']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const email = (profile.emails && profile.emails.length > 0) ? profile.emails[0].value.toLowerCase() : null;
            
            // Check by facebookId first
            let user = await User.findOne({ facebookId: profile.id });
            if (user) return done(null, user);

            if (email) {
                user = await User.findOne({ email: email });
                if (user) {
                    user.facebookId = profile.id;
                    await user.save();
                    return done(null, user);
                }
            }

            // Create new
            const newUser = new User({
                name: profile.displayName || (profile.name && profile.name.givenName) || 'Facebook User',
                email: email || `${profile.id}@missing-email.facebook.com`, // Fallback for no email
                facebookId: profile.id,
                authProvider: 'facebook'
            });
            await newUser.save();
            return done(null, newUser);
        } catch (err) {
            console.error('Facebook Auth Error:', err);
            return done(err, null);
        }
    }));
};
