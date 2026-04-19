const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    carName: {
        type: String,
        required: true,
    },
    carCategory: {
        type: String,
        required: true,
    },
    priceDaily: {
        type: Number,
        required: true,
    },
    priceWeekly: Number,
    priceMonthly: Number,
    carDescription: String,
    image: {
        type: String,
        required: true,
    },
    altText: String,
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;