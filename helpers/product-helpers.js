const Product = require('../models/product-models');

const productHelpers = {
    addProduct: async (productData) => {
        const newProduct = new Product({
            carName: productData.carName,
            carCategory: productData.carCategory,
            priceDaily: productData.priceDaily,
            priceWeekly: productData.priceWeekly,
            priceMonthly: productData.priceMonthly,
            carDescription: productData.carDescription,
            image: productData.image,
            altText: productData.altText,
        });
        return newProduct.save();
    },

    getAllProducts: async () => {
        return Product.find().lean();
    },

    getByCategory: async (category) => {
        return Product.find({ carCategory: category }).lean();
    },

    getProductDetails: async (productId) => {
        const product = await Product.findById(productId).lean();
        if (!product) {
            throw new Error("Product not found");
        }
        return product;
    },

    updateProduct: async (productId, productData) => {
        // Construct the update object from productData
        const updateData = {
            carName: productData.carName,
            carCategory: productData.carCategory,
            priceDaily: productData.priceDaily,
            priceWeekly: productData.priceWeekly,
            priceMonthly: productData.priceMonthly,
            carDescription: productData.carDescription,
            altText: productData.altText,
        };
        // Only update the image if a new one was provided
        if (productData.image) {
            updateData.image = productData.image;
        }
        
        return Product.updateOne({ _id: productId }, { $set: updateData });
    },

    deleteProduct: async (productId) => {
        return Product.deleteOne({ _id: productId });
    },
};

module.exports = productHelpers;