
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    googleId:{
        type: String
    },
    mobile_number: {
        type: Number,
        required: true
    },
    addresses:
        [{type:Schema.Types.ObjectId, ref:'Address'}],
        
    is_verified: {
        type: Number,
        default: 0
    },
    is_admin: {
        type: Number,
        default: 0
    },
    otp: {
        type: String,
    },
    otp_expiry: {
        type: Date,
    },
    is_blocked: {
        type: Boolean,
        default: 0
    },
    resetPasswordToken:{ 
        type:String,
        required:false
    },
    resetPasswordExpires:{
        type: Date,
        required: false
    },
}, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);