const mongoose = require('mongoose');
const objectId = mongoose.Schema.Types.ObjectId;

const wishlistSchema = mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId, 
        ref:'User',
        required:true,
    },

    items:[{
        productId:{
            type: mongoose.Schema.Types.ObjectId, 
            required:true,
            ref:'Product',
        }
    }],
    status:{
        type:String,
        enum:['added','not-added'],
        default:'added'
    }
},{
    timestamps:true
});

module.exports = mongoose.model('Wishlist',wishlistSchema);