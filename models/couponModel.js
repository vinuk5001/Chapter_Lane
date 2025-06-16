const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    couponCode: {
        type: String,
        required: true,
        unique: true
    },
    couponName: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    minimumAmount: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
