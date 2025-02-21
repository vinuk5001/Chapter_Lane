const {ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const CartItemSchema = new mongoose.Schema({

    Product: [{
        productId: {
            type:mongoose.Schema.Types.ObjectId,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            default:1
        }
    }],

totalAmount:{
    type:Number,
    default : 0
},
    
    userId:{
        type:String,
        required:true
    },
});


module.exports = mongoose.model('Cart',CartItemSchema);

