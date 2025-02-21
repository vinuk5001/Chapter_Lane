const Coupon = require('../models/couponModel');
const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');

const loadAddCoupon = async (req, res) => {
    try {
        
        const availableCoupons = await Coupon.find({})
        console.log("availableCoupons",availableCoupons);

        res.render("addCoupon",{availableCoupons});
    } catch (error) {
        console.log(error);
    }
}

const addCoupon = async (req, res) => {
    
    try {
        const {couponCode,couponName,discount,minimumAmount } = req.body;          
        const newCoupon = new Coupon({
            couponCode,
            couponName,
            discount,
            minimumAmount
        });

        console.log("newCoupon",newCoupon)

        // Saving the new coupon to the database
        await newCoupon.save();
         res.redirect("/admin/addCoupon")
    } catch (error) {
        console.log("Error adding coupon:", error);
    }
}



const fetchCoupons = async(req,res) => {
    try {
        const coupons = await Coupon.find({})
        console.log("fetchCoupons",coupons);
        if(!coupons){
            res.status(400).send("Coupons not exist");
        }else{
            res.status(200).send({coupons})
        }
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}

const deleteCoupon = async(req,res)=>{
    try {
        console.log("Enter into deleteCoupons");
        const {couponId} = req.query;
        console.log("requestquery",req.query);
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        console.log("deletedcoupon",deletedCoupon);
        res.status(200).json({success:true,message:'Coupon deleted successfully'});
    } catch (error) {
        console.log('Error deleting coupon :',error);
        res.status(500).json({success:false,message:'Failed to delete coupon'});
    }
}


const applyCoupons = async (req, res) => {

    try {
        console.log("hiiii")
        const { couponId } = req.body;        
        console.log("couponId",couponId);  
        const token = req.cookies.jwt;
        console.log("token:",token);
        if (!token) {
          throw new Error('JWT cookie not found');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("decoded",decoded);
        const userId = decoded.id;    
        const cart = await Cart.findOne({ userId: userId });
        console.log("cart",cart);
        const coupon = await Coupon.findById(couponId);
        console.log("coupon",coupon);
        if(!coupon){
            return res.status(404).json({success:false,message:"Coupon not found"});
        }

        if(!coupon.discount){
            return res.status(400).json({success:false,message:"Coupon has no discount value"});
        }
        
        if(cart.totalAmount >= coupon.minimumAmount){
            cart.totalAmount = cart.totalAmount - coupon.discount;
        }else{
            return res.status(400).json({success:false,message:"Cart total does not meet the minimum amount for this coupon"});
        }
        console.log("cart.totalAmount",cart.totalAmount);
        await cart.save()

        const result = {
            success: true,
            message: `Coupon ${couponId} applied successfully`,
            newTotal : cart.totalAmount,
            discount : coupon.discount,
            // Include other relevant data like new total, discount amount, etc.
        }
        res.json(result);
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to apply coupon' });
    }
}


const availableCoupons = async(req,res) =>{
    try {
        const coupons = await Coupon.find();
        res.json({coupons});
    } catch (error) {
       console.log(error);

    }
}

const updateTotalAmount = async (req,res)=>{
    try {

      const {selectedCoupons,originalTotalAmount} = req.body;
      console.log("requested",req.body);
  

    } catch (error) {
        console.log(error)
    }
}



module.exports = {
    loadAddCoupon,
    addCoupon,
    fetchCoupons,
    applyCoupons,
    availableCoupons,
    updateTotalAmount,
    deleteCoupon
}
