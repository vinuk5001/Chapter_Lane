const mongoose = require("mongoose");
const User = require("../models/userModel");
const Product = require("../models/productModel"); 
const Category = require("../models/categoryModel");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");
const jwt = require("jsonwebtoken");


const checkOut = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      throw new Error("JWT cookie not found");
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.render('checkOut', {totalAmount:0, cartItems: [] });
    }
    
    const cartItems = await Promise.all(cart.Product.map(async (item) => {
      const product = await Product.findById(item.productId)
      if (!product) {
        console.error(`Product with ID ${item.productId} not found`);
        return null; 
      }
      const subtotal = product.price * item.quantity;
      return {
        product: product.toObject(),
        quantity: item.quantity,
        subtotal: subtotal,
      }

    }))

  
    const validCartItems = cartItems.filter(item => item !== null);
    const totalAmount = validCartItems.reduce((acc, item) => acc + item.subtotal, 0);
    cart.totalAmount = totalAmount;
    await cart.save();
    const addresses = await Address.find({ userId });
    res.render('checkOut', {
      cartItems: validCartItems,
      cart: cart,
      totalAmount: totalAmount,
      addresses: addresses,
      price: totalAmount 
    });    
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

    
  const addressCheckout = async(req,res)=>{
    try{
      const token = req.cookies.jwt;
      if(!token){
        throw new Error("JWT cookie not found");
      }
      const JWT_SECRET = process.env.JWT_SECRET;
      const decoded = jwt.verify(token,JWT_SECRET);
      const userId = decoded.id;
      const {address,city,state,pincode} = req.body;
       
      const newAddress = new Address({
        userId: userId,
        address: address,
        city: city,
        state: state,
        pincode: pincode
      });     
      await newAddress.save();
      res.redirect("/checkOut");
    }catch (error){
      console.log(error.message);
      res.status(500).send("Internal Server Error");
    }
  }
  
  module.exports = {
    checkOut,
    addressCheckout
  }


  