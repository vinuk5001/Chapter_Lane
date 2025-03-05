const Order = require("../models/orderModel");
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const jwt = require('jsonwebtoken');
const Wallet = require("../models/walletModel");
const Address = require("../models/addressModel");
const Coupon = require("../models/couponModel");
const Review = require("../models/reviewsModel");
const mongoose = require("mongoose");


//------------------------Cash On Delivery Order---------------------//

const placeorder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { subtotal, addressId, discountedTotal, paymentMethod, selectedCoupons } = req.body;
        const address = await Address.findById(addressId);
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }
        let totalDiscount = 0;
        let finalSubtotal = parseFloat(subtotal);
        let finalTotalAmount = finalSubtotal;
        let minAmount = 0;
        if (selectedCoupons && selectedCoupons.length > 0) {
            selectedCoupons.forEach((coupon) => {
                const { couponId, discount, minAmount: couponMinAmount } = coupon;
                minAmount = Math.max(minAmount, couponMinAmount);
                console.log(`Applying coupon: ${couponId}, Discount: ${discount}%,minAmount:${couponMinAmount}`);

                if (finalTotalAmount >= couponMinAmount) {
                    const discountAmount = (finalTotalAmount * discount) / 100;
                    totalDiscount += discountAmount;
                    console.log(`Applying discount: Rs ${discountAmount}`);
                } else {
                    console.log(`Coupon ${couponId} cannot be applied because the total amount is below the minimum`);
                }
            });
            finalTotalAmount -= totalDiscount;
        }

        if (paymentMethod === 'cashondelivery' && finalTotalAmount > 1000) {
            return res.status(400).json({
                message: 'Cash on Delivery is not available for orders above Rs 1000.'
            })
        }

        const cartItems = await Promise.all(cart.Product.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) {
                console.error(`Product with ID ${item.productId} not found`);
                return null;
            }
            const productSubtotal = product.price * item.quantity;
            return {
                product: product.toObject(),
                quantity: item.quantity,
                subtotal: productSubtotal,
                address: address
            };
        }));

        const validCartItems = cartItems.filter(item => item !== null);
        const newOrder = new Order({
            user: userId,
            items: validCartItems,
            couponDiscount: totalDiscount,
            couponAmount: minAmount,
            billTotal: finalTotalAmount,
            paymentMethod: paymentMethod,
            subtotal: subtotal || finalTotalAmount,
            shippingAddress: address,
            orderStatus: "Shipped"
        });

        const saveData = await newOrder.save();
        if (saveData) {
            await Promise.all(validCartItems.map(async (item) => {
                const product = await Product.findById(item.product._id);
                if (product) {
                    product.stock -= item.quantity;
                    await product.save();
                }
            }))
            await cart.deleteOne({ userId: userId });

            res.redirect("/order-Confirmation");
        }

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

//-----------------------------Online Payment ----------------------------//


const payonline = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { subtotal, discountedTotal, paymentMethod, selectedCoupons } = req.query;
        const addressId = req.query.address_id;
        if (!addressId) {
            return res.status(400).json({ message: "Address ID is required" });
        }
        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(400).json({ message: "Address not found" });
        }
        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }
        let totalDiscount = 0;
        let finalSubtotal = parseFloat(subtotal);
        let finalTotalAmount = finalSubtotal;
        let parsedCoupons = [];
        let minAmount = 0;
        try {
            if (selectedCoupons) {
                parsedCoupons = JSON.parse(decodeURIComponent(selectedCoupons));  // Decode and parse it into an array
            }
        } catch (err) {
            console.error("Error parsing selectedCoupons:", err);
        }

        if (Array.isArray(parsedCoupons) && parsedCoupons.length > 0) {
            parsedCoupons.forEach((coupon) => {
                const { couponId, discount, minAmount: couponMinAmount } = coupon;
                minAmount = Math.max(minAmount, couponMinAmount);
                console.log(`Applying coupon: ${couponId}, Discount: ${discount}%,minAmount:${couponMinAmount}`);

                if (finalTotalAmount >= couponMinAmount) {
                    const discountAmount = (finalTotalAmount * discount) / 100;
                    totalDiscount += discountAmount;
                } else {
                    console.log(`Coupon ${couponId} cannot be applied because the total amount is below the minimum`);
                }
            });

            finalTotalAmount -= totalDiscount;
        } else {
            console.log("No valid coupons or parsing failed.");
        }

        const cartItems = await Promise.all(cart.Product.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) {
                console.error(`Product with ID ${item.productId} not found`);
                return null;
            }
            const productSubtotal = product.price * item.quantity;
            return {
                product: product.toObject(),
                quantity: item.quantity,
                subtotal: productSubtotal,
                address: address
            };
        }));

        const validCartItems = cartItems.filter(item => item !== null);

        const newOrder = new Order({
            user: userId,
            items: validCartItems,
            couponDiscount: totalDiscount,
            couponAmount: minAmount,
            billTotal: finalTotalAmount,
            paymentMethod: "onlinePayment",
            subtotal: parseFloat(subtotal),
            shippingAddress: address,
            paymentFailed: false,
            orderStatus: 'Shipped'
        });

        const savedOrder = await newOrder.save();
        if (savedOrder) {

            await Promise.all(validCartItems.map(async (item) => {
                const product = await Product.findById(item.product._id);
                if (product) {
                    product.stock -= item.quantity;
                    await product.save();
                }
            }));

            await cart.deleteOne({ userId: userId });
            res.redirect("/order-Confirmation");
        } else {
            return res.status(500).json({ message: "Failed to create order" });
        }
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


//-------------------------------Repayment --------------------------------//


const payonlineFailed = async (req, res) => {
    try {
        const userId = req.user.id;
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { subtotal, discountedTotal, paymentMethod, selectedCoupons } = req.query;

        const addressId = req.query.address_id;

        if (!addressId) {
            return res.status(400).json({ message: "Address ID is required" });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(400).json({ message: "Address not found" });
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }

        let totalDiscount = 0;
        let finalSubtotal = parseFloat(subtotal);
        let finalTotalAmount = finalSubtotal;
        let minAmount = 0;

        let parsedCoupons = [];
        try {
            if (selectedCoupons) {
                parsedCoupons = JSON.parse(decodeURIComponent(selectedCoupons));
            }
        } catch (err) {
            console.error("Error parsing selectedCoupons:", err);
        }

        if (Array.isArray(parsedCoupons) && parsedCoupons.length > 0) {
            parsedCoupons.forEach((coupon) => {
                const { couponId, discount, minAmount: couponMinAmount } = coupon;
                minAmount = Math.max(minAmount, couponMinAmount);
                console.log(`Applying coupon: ${couponId}, Discount: ${discount}%`);

                if (finalTotalAmount >= couponMinAmount) {
                    const discountAmount = (finalTotalAmount * discount) / 100;
                    totalDiscount += discountAmount;
                    console.log(`Applying discount: Rs ${discountAmount}`);
                } else {
                    console.log(`Coupon ${couponId} cannot be applied because the total amount is below the minimum`);
                }
            })

            finalTotalAmount -= totalDiscount;
        } else {
            console.log("No valid coupons or parsing failed.");
        }

        const cartItems = await Promise.all(cart.Product.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product) {
                console.error(`Product with ID ${item.productId} not found`);
                return null;
            }
            const productSubtotal = product.price * item.quantity;
            return {
                product: product.toObject(),
                quantity: item.quantity,
                subtotal: productSubtotal,
                address: address
            };
        }));

        const validCartItems = cartItems.filter(item => item !== null);

        const newFailedOrder = new Order({
            user: userId,
            items: validCartItems,
            couponDiscount: totalDiscount,
            couponAmount: minAmount,
            billTotal: finalTotalAmount,
            paymentMethod: "onlinePayment",
            subtotal: parseFloat(subtotal),
            shippingAddress: address,
            orderStatus: "Pending",
            paymentFailed: true,
        });

        const savedFailedOrder = await newFailedOrder.save();
        if (savedFailedOrder) {
            await Promise.all(validCartItems.map(async (item) => {
                const product = await Product.findById(item.product._id);
                if (product) {
                    product.stock -= item.quantity;
                    await product.save();
                }
            }));

            await cart.deleteOne({ userId: userId });
            res.redirect("/orderFailed");
        } else {
            return res.status(500).json({ message: "Failed to create order" });
        }
    } catch (error) {
        console.error('Error processing failed payment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


//------------------------------- Payment Confirmation --------------------------//

const orderConfirmation = async (req, res) => {
    try {
        res.render("orderConfirmation")
    } catch (error) {
        console.log(error)
    }
}

//------------------------------- Order Failed Confirmation --------------------------//

const orderFailed = async (req, res) => {
    try {
        res.render("orderFailed")
    } catch (error) {
        console.log(error)
    }
}


//-----------------------------------Cancel Order --------------------------------//


const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.orderStatus = "Cancelled";
        console.log("order.orderStatus", order.orderStatus);
        await order.save();
        let refundAmount = 0;
        if (order.paymentMethod === 'onlinePayment') {
            refundAmount = order.billTotal;

            if (isNaN(refundAmount)) {
                console.error("Refund amount is not a valid number:", refundAmount);
                return res.status(400).send('Invalid refund amount');
            }
            const userId = order.user;

            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                return res.status(404).json({ error: "Wallet not found" });
            }

            wallet.walletBalance += refundAmount;

            wallet.transactions.push({
                date: new Date(),
                description: `Refund for Order ID: ${orderId}`,
                amount: refundAmount,
                status: "Refunded"
            });

            await wallet.save();

            res.status(200).send('Order cancelled and refund processed');
        } else {
            res.status(400).send("Order is not eligible for refund");
        }

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).send("Server Error: Failed to cancel order");
    }
}


//------------------------------Return Order --------------------------------//


const returnOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.orderStatus = "Returned";
        order.returnReason = reason;
        await order.save()
        let refundAmount = 0;
        refundAmount = order.billTotal;

        if (isNaN(refundAmount)) {
            console.error("Refund amount is not a valid number:", refundAmount);
            return res.status(400).send('Invalid refund amount');
        }
        const userId = order.user;
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            return res.status(404).json({ error: "Wallet not found" });
        }
        wallet.walletBalance += refundAmount;
        wallet.transactions.push({
            date: new Date(),
            description: `Refund for returned Order ID: ${orderId}`,
            amount: refundAmount,
            status: "Refunded"
        })

        await wallet.save();

        res.status(200).send('Order returned and refund processed');

    } catch (error) {
        console.error("Error returning order:", error);
        res.status(500).send("Server Error: Failed to return order");
    }
}

//----------------------checking if Ordered -------------------------//

const hasOrderedProduct = async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.productId;
        const order = await Order.findOne({
            userId: userId,
            'items.productId': productId,
        })
        if (order) {
            return res.status(200).json({ ordered: true });
        } else {
            return res.status(200).json({ ordered: false });
        }
    } catch (error) {
        console.log("Error checking order status:", error);
        return res.status(200).json({ error: error.message });
    }
}





module.exports = {
    placeorder,
    cancelOrder,
    returnOrder,
    orderConfirmation,
    payonline,
    orderFailed,
    payonlineFailed,
    hasOrderedProduct,
}


