const mongoose = require('mongoose');
const objectID = mongoose.Schema.Types.ObjectId;

const walletSchema = new mongoose.Schema({
    user: {
        type: objectID,
        ref: 'User',
        required: true
    },
    walletBalance: {
        type: Number,
        default: 0
    },
    amountSpent: {
        type: Number,
        default: 0
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundType: {
        type: String,
    },
    transactions: [{
        date: { 
            type: Date, 
            default: Date.now 
        },
        description: { 
            type: String 
        },
        amount: { 
            type: Number 
        },
        status: { 
            type: String 
        }
    }]
}, {
    timestamps: true // Enables createdAt and updatedAt timestamps
});

module.exports = mongoose.model('Wallet', walletSchema);
