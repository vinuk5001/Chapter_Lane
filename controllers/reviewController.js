
const Product = require("../models/productModel");
const Review = require("../models/reviewsModel");
const user = require("../models/userModel");
const mongoose = require("mongoose");
const Order = require('../models/orderModel')


//---------------------------Add Review --------------------------//

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const userId = req.user && req.user.id
    if (!userId) {
      return res.status(401).json({ error: 'You must be logged in to add a review' });
    }
    const productId = req.params.productId;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await Product.findById(productId).populate('reviews');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this product ' });
    }

    const newReview = new Review({
      productId,
      userId,
      rating,
      comment,
    })

    await newReview.save();
    product.reviews.push(newReview._id);
    await product.save();

    res.status(200).json({
      message: 'Review added successfully',
      review: newReview,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}


//-----------------------------Get Review--------------------------//

const getReview = async (req, res) => {
  try {
    console.log("getReview")
    const productId = req.params.productId;
    const reviews = await Review.find({ productId }).populate('userId', 'username').exec();
    if (!reviews.length === 0) {
      return res.status(404).json({ message: 'No reviews found for this product' });
    }
    res.status(200).json(reviews)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    res.status(500).json({ error: error.message })
  }
}





module.exports = {
  addReview,
  getReview,
}
