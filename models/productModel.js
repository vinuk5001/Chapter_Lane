const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: [true,"Author is required"],
        minlength:[1,"Author name cannot be empty"]
    },
    description: {
        type: String,
        required: true
    },
    images: {
        type: [String],
        required:true,
        validate:{
            validator:function(val){
                return val.length >= 2;
            },
            message:'At least 2 images are required'
        }
    },
    price: {
        type: Number,
        required: true
    },
    discount:{
        type: Number,
        min: 0,
        default:0
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    is_published: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'OutOfStock'],
        default: 'Active',
        required:true,
    },
    stock: {
        type: Number,
        required: true,
        default: 1
    },
    ratings: {
        type: Number,
        min: 1,
        max: 5
    },
    highlights: {
        type: String
    },
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Review'
    }],
    isListed: {
        type: Boolean,
        default: true
    },
    updated_at: {
        type: Date,
        default: Date.now
    },
    
    deleted_at: {
        type: Date,
        default: null
    },
    views: {
        type: Number,
        default: 0
    }
    
}, {
    timestamps: true
});

function arrayLimit(val) {
    return val.length >= 2;
}

module.exports = mongoose.model('Product', productSchema);

