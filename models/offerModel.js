const mongoose = require('mongoose');

const categoryOfferSchema = new mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', 
        required: true
    },
    discount: {
        type: Number,
        required: true,
        min: 0,   
        max: 100  
    },
    isActive: {
        type: Boolean,
        default: true  
    }
}, { timestamps: true });

module.exports = mongoose.model('CategoryOffer', categoryOfferSchema);
