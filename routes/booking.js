const express = require('express');
const router = express.Router();
const Car = require('../models/product-models');

// GET booking page
router.get('/:carId', async (req, res) => {
  const car = await Car.findById(req.params.carId);
  if (!car) return res.redirect('/fleet');

  res.render('users/rent-now', { car });
});

// POST booking preview
router.post('/preview', (req, res) => {
  // save booking data temporarily
  req.session.bookingData = req.body;

  if (!req.session.user) {
    req.session.redirectTo = '/booking/confirm';
    return res.redirect('/login');
  }

  res.redirect('/booking/confirm');
});

// CONFIRM page
router.get('/confirm', (req, res) => {
  if (!req.session.bookingData) return res.redirect('/fleet');

  res.render('users/booking-confirm', {
    booking: req.session.bookingData,
    user: req.session.user
  });
});

module.exports = router;
