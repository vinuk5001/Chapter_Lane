const mongoose = require('mongoose');
const Wishlist = require("../models/wishlistModel");
const Product = require('../models/productModel');
const jwt = require('jsonwebtoken');
const Category = require("../models/categoryModel");


//------------------------------Load WishList------------------------------//

const loadWishlist = async (req, res) => {
    try {
        const token = req.cookies.jwt;
        if (!token) throw new Error('JWT cookie not found');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const wishlist = await Wishlist.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(userId) } },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productDetails.category",
                    foreignField: "_id",
                    as: "categoryDetails"
                }
            },
            { $unwind: { path: "$categoryDetails", preserveNullAndEmptyArrays: true } },
               
             {
                $addFields: {
                    discountedPrice: {
                        $cond: {
                            if: { $gt: ["$productDetails.discount", 0] },
                            then: {
                                $round: [
                                    {
                                        $subtract: [
                                            "$productDetails.price",
                                            {
                                                $multiply: [
                                                    "$productDetails.price",
                                                    { $divide: ["$productDetails.discount", 100] }
                                                ]
                                            }
                                        ]
                                    },
                                    2
                                ]
                            },
                            else: "$productDetails.price"
                        }
                    }
                }
            },



            {
                $project: {
                    _id: 0,
                    productId: "$productDetails._id",
                    productName: "$productDetails.name",
                    productPrice: "$productDetails.price",
                    discountedPrice : 1,
                    productDescription: "$productDetails.description",
                    productImage: { $arrayElemAt: ["$productDetails.images", 0] },
                    productStock: "$productDetails.stock",
                    productStatus: "$productDetails.status",
                    discount : "$productDetails.discount",
                    categoryName: "$categoryDetails.name",
                }
            }
        ]);

        if (!wishlist || wishlist.length === 0) {
            return res.render('wishList', { wishlist: [], message: "Your wishlist is empty" });
        }

        res.render('wishList', { wishlist, message: null, userId });

    } catch (error) {
        console.error('Error loading wishlist:', error);
        res.status(500).send("An error occurred while loading the wishlist.");
    }
};


//------------------------------------AddToWishList------------------------------------//


const addToWishlist = async (req, res) => {
    try {
        console.log("entering into addwishlist")
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const { productId } = req.body;
        const product = await Product.findById(productId)
        let discountedPrice = product.price;
        if(product.discount > 0){
            discountedPrice = (product.price - (product.price * product.discount/100)).toFixed(2);
        }
        console.log("discountedPrice",discountedPrice);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let wishlist = await Wishlist.findOne({ user: userId }).populate('items.productId');
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, items: [] });
        }
         console.log("wishlist",wishlist)
        if (!Array.isArray(wishlist.items)) {
            wishlist.items = [];
        }
        if (!wishlist.items.some(item => item.productId.toString() === productId.toString())) {
            wishlist.items.push({ productId: new mongoose.Types.ObjectId(productId) });
            await wishlist.save();
            return res.json({ success: true,productId,discountedPrice, message: 'Added to wishlist' });
        }

        return res.json({ success: true, alreadyExists:true,message: 'Product already in wishlist' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'An error occurred while adding to wishlist' });
    }
};


//-------------------------------------------Remove From WishList---------------------------------//

const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const token = req.cookies.jwt;
        if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) return res.status(404).json({ success: false, message: 'Wishlist not found' });

        wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId);
        await wishlist.save();


        return res.json({ success: true, message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        res.status(500).json({ success: false, message: 'An error occurred while removing from wishlist' });
    }
}



module.exports = {
    loadWishlist,
    addToWishlist,
    removeFromWishlist
};

