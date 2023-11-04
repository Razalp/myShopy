const mongoose = require('mongoose');

const couponSchema = mongoose.Schema({
    code: {
        type: String,
        required: true,
        uppercase: true,
    },
    type: {
        type: String,
        required: true,
        uppercase: true,
    },
    expireDate: {
        type: Date,
        required: true,
    },
    discount: {
        type: String,
        required: true,
    },
    min: {
        type: Number,
        required: true,
    },
    isDelete: {
        type: Boolean,
        default: false
    },
    category: {
        type: String
    }
});

module.exports = mongoose.model('Coupon', couponSchema);
