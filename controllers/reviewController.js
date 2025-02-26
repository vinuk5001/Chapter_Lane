const Product = require("../models/productModel");
const Review = require("../models/reviewsModel");
const user = require("../models/userModel");
const mongoose = require("mongoose");
const Order = require('../models/orderModel')

const addReview = async (req, res) => { 
  try {
      console.log('Adding review');
      const { rating, comment } = req.body; 
      console.log("Requested data:", req.body);
      const userId = req.user && req.user.id;
      if (!userId) {
          return res.status(401).json({ error: 'You must be logged in to add a review' });
      }
      console.log("User ID:", userId);
      const productId = req.params.productId;
      console.log("Product ID from query:", productId);
      if (!mongoose.Types.ObjectId.isValid(productId)) {
          console.log('Invalid product ID');
          return res.status(400).json({ error: 'Invalid product ID' });
      }

      const product = await Product.findById(productId).populate('reviews');
      console.log("Found product:", product);

      if (!product) {
          console.log('Product not found');
          return res.status(404).json({ error: 'Product not found' });
      }

      const existingReview = await Review.findOne({productId,userId});
      if(existingReview){
        return res.status(400).json({error:'You have already reviewed this product '});
      }
      console.log("existingReview",existingReview);

      const newReview = new Review({
          productId,
          userId,
          rating,
          comment,
      });

      await newReview.save();
      console.log('Saved review:', newReview);
      product.reviews.push(newReview._id);
      await product.save();
      console.log('Updated Product after adding review:', product);

      res.status(200).json({
         message: 'Review added successfully',
         review : newReview, 
        });
  } catch (error) {
      console.error('Error:', error); 
      res.status(500).json({ error: error.message });
  }
}



  const getReview = async (req,res)=>{
    try {
        console.log("gotReview")
        const productId = req.params.productId;
         console.log("productId:", productId);
        const reviews = await Review.find({productId}).populate('userId','username');
        console.log("reviews:", reviews);   
        if (!reviews.length === 0) {
            return res.status(404).json({ message: 'No reviews found for this product' });
          }      
        res.status(200).json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
       res.status(500).json({error:error.message}); 
    }
  } 


module.exports = {
    addReview,
    getReview,
}
