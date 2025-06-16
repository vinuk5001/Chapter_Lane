const Coupon = require('../models/couponModel');
const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');


//-------------------Loading Add Coupon---------------------//

const loadAddCoupon = async (req, res) => {
    try {
        const availableCoupons = await Coupon.find({})
        res.render("addCoupon", { availableCoupons });
    } catch (error) {
        console.log(error);
    }
}


//-------------------Adding Coupon---------------------//

const addCoupon = async (req, res) => {
    try {
        const { couponCode, couponName, discount, minimumAmount } = req.body;
        const newCoupon = new Coupon({
            couponCode,
            couponName,
            discount,
            minimumAmount
        });
        await newCoupon.save();
        res.redirect("/admin/addCoupon")
    } catch (error) {
        console.log("Error adding coupon:", error);
    }
}


//---------------------------FetchCoupons-------------------------//


const fetchCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({})
        if (!coupons) {
            res.status(400).send("Coupons not exist");
        } else {
            res.status(200).send({ coupons })
        }
    } catch (error) {
        console.log(error)
        res.status(500).send(error)
    }
}


//---------------------------Delete Coupon-------------------------//


const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.query;
        const deletedCoupon = await Coupon.findByIdAndDelete(couponId);
        res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    } catch (error) {
        console.log('Error deleting coupon :', error);
        res.status(500).json({ success: false, message: 'Failed to delete coupon' });
    }
}


//-----------------------------Applying Coupon---------------------//


const applyCoupons = async (req, res) => {

    try {
        const { couponId } = req.body;
        const token = req.cookies.jwt;
        if (!token) {
            throw new Error('JWT cookie not found');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const cart = await Cart.findOne({ userId: userId });
        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        if (!coupon.discount) {
            return res.status(400).json({ success: false, message: "Coupon has no discount value" });
        }

        if (cart.totalAmount >= coupon.minimumAmount) {
            cart.totalAmount = cart.totalAmount - coupon.discount;
        } else {
            return res.status(400).json({ success: false, message: "Cart total does not meet the minimum amount for this coupon" });
        }
        await cart.save()

        const result = {
            success: true,
            message: `Coupon ${couponId} applied successfully`,
            newTotal: cart.totalAmount,
            discount: coupon.discount,
        }
        res.json(result);
    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({ success: false, message: 'Failed to apply coupon' });
    }
}


//--------------------------Available coupons -------------------------//


const availableCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find();
        res.json({ coupons });
    } catch (error) {
        console.log(error);

    }
}

//---------------------------Update Total Amount-------------------------//


const updateTotalAmount = async (req, res) => {
    try {

        const { selectedCoupons, originalTotalAmount } = req.body;
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
