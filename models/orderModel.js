const mongoose = require('mongoose');
const {Schema,model} = mongoose;
const {ObjectId} = Schema.Types;
const orderSchema = new mongoose.Schema({
    user: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    cart: {
        type: ObjectId,
        ref: 'Cart'
    },
   
    orderStatus: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Deleted', 'Returned'],
        default: 'Pending'
    },
    items:{
        type:Array
    },
    billTotal: {
        type: Number,
        required:true
        
    },
    couponAmount:{
        type : Number,        
    },
    couponDiscount:{
        type:Number,
    },
    totalAmount:{
        type:Number,
    },
    additionalMobile: {
        type: String,
        default: ''
    },
    coupon :{
        type:ObjectId,
        ref:'Coupon'
    },
    shippingAddress: {
        type:Schema.Types.ObjectId,
        ref:'Address'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    paymentFailed:{
        type:Boolean,
        default:false
    },
  
    orderDate: {
        type: Date,
        default: Date.now
    },
    
    cancellationReason: {
        type: String,
        default: ''
    },
    returnReason:{
        type:String,
        default: ''
    },
    isReturnApproved:{
        type: Boolean,
        default:null
    },
    subtotal:{
        type:Number,
    }
   
}, {
    timestamps: true
})


module.exports = mongoose.model('Order', orderSchema);



