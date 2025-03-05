
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        unique:true,
        trim:true,
    },
    offer:{
        type:Number,
        min:0,
        max:100
    },
    description: {
        type: String,
        required: [true, 'Description is required'],
        unique:true,
        trim:true
    },
    order: {
        type: String
    },
    is_Listed: {
        type: Boolean,
        default: true
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
})



module.exports = mongoose.model('Category', categorySchema);
