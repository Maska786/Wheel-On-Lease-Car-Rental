require('dotenv').config(); // ✅ load environment variables

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const exphbs = require('express-handlebars');
const { allowInsecurePrototypeAccess } = require('@handlebars/allow-prototype-access');
const Handlebars = require('handlebars');
const createError = require('http-errors');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const connectDB = require('./config/mongoose');

// Passport config
require('./config/passport')(passport);


// Connect to MongoDB
connectDB();

const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin');
const bookingRouter = require('./routes/booking');

const app = express();

// View engine setup
app.engine('hbs', exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views', 'Layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
    handlebars: allowInsecurePrototypeAccess(Handlebars),
    helpers: {
        addOne: (index) => parseInt(index) + 1,
        select: function (selectedValue, options) {
            return options.fn(this).replace(
                new RegExp(' value=\"' + selectedValue + '\"'),
                '$& selected="selected"'
            );
        }
    }
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

// ✅ Session middleware with MongoDB
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/carRental', // fallback if .env not set
        collectionName: 'sessions'
    }),
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// Initialize Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);
app.use('/booking', bookingRouter);

// 404 handler
app.use((req, res, next) => {
    next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
