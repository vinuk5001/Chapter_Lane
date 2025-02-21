const Order = require("../models/orderModel");
const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const jwt = require('jsonwebtoken');
const Wallet = require("../models/walletModel");
const Address = require("../models/addressModel");
const Coupon = require("../models/couponModel");

const placeorder = async (req, res) => {
    try {
        console.log("hiiiihloo")
        const userId = req.user.id;
        const { subtotal, addressId, discountedTotal, paymentMethod, selectedCoupons } = req.body;
        console.log("selectedCoupons",selectedCoupons);

        console.log("cashrequested", req.body);
        const address = await Address.findById(addressId);
        console.log("cashaddress", address);
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(400).json({ message: 'Cart not found' });
        }
        console.log("cashcart", cart);
        let totalDiscount = 0;
        let finalSubtotal = parseFloat(subtotal);
        let finalTotalAmount = finalSubtotal;
        let minAmount = 0;
        if (selectedCoupons && selectedCoupons.length > 0) {
            selectedCoupons.forEach((coupon) => {
                const { couponId, discount,minAmount:couponMinAmount} = coupon;
                  minAmount = Math.max(minAmount,couponMinAmount);
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
            console.log("Final Total Amount after discount:", finalTotalAmount);
        }

        if(paymentMethod === 'cashondelivery' && finalTotalAmount > 1000){
             return res.status(400).json({
                message:'Cash on Delivery is not available for orders above Rs 1000.'
             })
        }

        const cartItems = await Promise.all(cart.Product.map(async (item) => {
            const product = await Product.findById(item.productId);
            console.log("cashProduct", product);
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
            couponDiscount:totalDiscount,
            couponAmount :minAmount, 
            billTotal: finalTotalAmount,
            paymentMethod: paymentMethod, 
            subtotal: subtotal || finalTotalAmount,
            shippingAddress: address,
            orderStatus : "Shipped"
        });

        console.log("cashnewOrder", newOrder);
        const saveData = await newOrder.save();
        console.log("cashSaveDta", saveData);

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


const payonline = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("onlineuserID", userId);
        
        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        const { subtotal, discountedTotal, paymentMethod, selectedCoupons } = req.query;
        console.log("onlineRequestBody:", req.query);

        const addressId = req.query.address_id;
        console.log("onlineaddressID", addressId);
        
        if (!addressId) {
            return res.status(400).json({message: "Address ID is required"});
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(400).json({message: "Address not found"});
        }
        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }
        let totalDiscount = 0;
        let finalSubtotal= parseFloat(subtotal);
        let finalTotalAmount = finalSubtotal;
        let parsedCoupons = [];
        let minAmount = 0;
        try {
            if (selectedCoupons) {
                parsedCoupons = JSON.parse(decodeURIComponent(selectedCoupons));  // Decode and parse it into an array
                console.log("Parsed selectedCoupons:", parsedCoupons);
            }
        } catch (err) {
            console.error("Error parsing selectedCoupons:", err);
        }

        // If selectedCoupons is an array, apply discounts
        if (Array.isArray(parsedCoupons) && parsedCoupons.length > 0) {
            parsedCoupons.forEach((coupon) => {
                const { couponId, discount, minAmount:couponMinAmount } = coupon;
                minAmount = Math.max(minAmount,couponMinAmount);
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
            console.log("Final Total Amount after applying discounts:", finalTotalAmount);
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
            couponDiscount:totalDiscount,
            couponAmount :minAmount, 
            billTotal: finalTotalAmount, 
            paymentMethod: "onlinePayment",
            subtotal: parseFloat(subtotal), 
            shippingAddress: address, 
            paymentFailed : false, 
            orderStatus :'Shipped'                     
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


const payonlineFailed = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("Failed online user ID", userId);

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated" });
        }

        const { subtotal, discountedTotal, paymentMethod, selectedCoupons } = req.query;
        console.log("Failed online request body:", req.query);

        const addressId = req.query.address_id;
        console.log("Failed online address ID", addressId);

        if (!addressId) {
            return res.status(400).json({ message: "Address ID is required" });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(400).json({message: "Address not found" });
        }

        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(400).json({ message: "Cart not found" });
        }

        let totalDiscount = 0;
        let finalSubtotal = parseFloat(subtotal);
        let finalTotalAmount = finalSubtotal;
        let minAmount = 0;

        // Parse selectedCoupons, if it is a string, decode and parse it into an array
        let parsedCoupons = [];
        try {
            if (selectedCoupons) {
                parsedCoupons = JSON.parse(decodeURIComponent(selectedCoupons));  // Decode and parse it into an array
                console.log("Parsed selectedCoupons:", parsedCoupons);
            }
        } catch (err) {
            console.error("Error parsing selectedCoupons:", err);
        }

        // If selectedCoupons is an array, apply discounts
        if (Array.isArray(parsedCoupons) && parsedCoupons.length > 0) {
            parsedCoupons.forEach((coupon) => {
                const { couponId, discount, minAmount:couponMinAmount } = coupon;
                minAmount = Math.max(minAmount,couponMinAmount);              
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
            console.log("Final Total Amount after applying discounts:", finalTotalAmount);
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

        // Create the order with paymentFailed flag as true (payment failed)
        const newFailedOrder = new Order({
            user: userId,
            items: validCartItems,
            couponDiscount:totalDiscount,
            couponAmount :minAmount, 
            billTotal: finalTotalAmount,
            paymentMethod: "onlinePayment",
            subtotal: parseFloat(subtotal),
            shippingAddress: address,
            orderStatus: "Pending",  // Status set to "pending"
            paymentFailed: true,     // Payment failed
        });

        const savedFailedOrder = await newFailedOrder.save();
        if (savedFailedOrder) {
            // Optionally, notify the user or trigger logs for failed payment
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


const orderConfirmation = async(req,res)=>{
    try {
       res.render("orderConfirmation")
    } catch (error) {
        console.log(error)
    }
}

const orderFailed = async(req,res)=>{
    try {
        res.render("orderFailed")
    } catch (error) {
       console.log(error) 
    }
}


const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        console.log("requested",req.body);
        const order = await Order.findById(orderId);
        console.log("order:",order)
        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.orderStatus = "Cancelled";
        console.log("order.orderStatus",order.orderStatus);
        await order.save();
        let refundAmount = 0;  
        if (order.paymentMethod === 'onlinePayment')
        {
            refundAmount = order.billTotal;

            if (isNaN(refundAmount)) {
                console.error("Refund amount is not a valid number:", refundAmount);
                return res.status(400).send('Invalid refund amount');
            }
            const userId = order.user;
            console.log("userId",userId);

            const wallet = await Wallet.findOne({ user: userId });
            console.log("wallet",wallet);
            if (!wallet) {
                return res.status(404).json({ error: "Wallet not found" });
            }

            wallet.walletBalance += refundAmount;
            console.log("Updated wallet balance:", wallet.walletBalance);

            wallet.transactions.push({
                date: new Date(),
                description: `Refund for Order ID: ${orderId}`,
                amount: refundAmount,
                status: "Refunded"
            });

            await wallet.save();
            console.log("Wallet updated with refund and transaction details");

            res.status(200).send('Order cancelled and refund processed');
        } else {
        
            console.log("Order is not eligible for refund based on payment method and status");
            res.status(400).send("Order is not eligible for refund");
        }

    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).send("Server Error: Failed to cancel order");
    }
}



const returnOrder = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        console.log("req return:",req.body);
        const order = await Order.findById(orderId);
        console.log("returnorder:",order);
        if (!order) {
            return res.status(404).send('Order not found');
        }
        // Update order status to 'Returned'
        order.orderStatus = "Returned";
        order.returnReason = reason; 
        console.log("OrderReason:", orderReason)
        await order.save()
        let refundAmount = 0;
            refundAmount = order.billTotal;
            
            if (isNaN(refundAmount)) {
                console.error("Refund amount is not a valid number:", refundAmount);
                return res.status(400).send('Invalid refund amount');
            }
            console.log("Order status updated to Returned");
            const userId = order.user;
            console.log("User ID associated with the order:", userId);
            const wallet = await Wallet.findOne({ user: userId });
            if (!wallet) {
                return res.status(404).json({ error: "Wallet not found" });
            }
            console.log("User's wallet details:", wallet);
            wallet.walletBalance += refundAmount;
            console.log("Updated wallet balance:", wallet.walletBalance);
            wallet.transactions.push({
                date: new Date(),
                description: `Refund for returned Order ID: ${orderId}`,
                amount: refundAmount,
                status: "Refunded"
            })

            await wallet.save();
            console.log("Wallet updated with refund and transaction details");

            res.status(200).send('Order returned and refund processed');

    } catch (error) {
        console.error("Error returning order:", error);
        res.status(500).send("Server Error: Failed to return order");
    }
}


 module.exports = {
    placeorder,
    cancelOrder,
    returnOrder,
    orderConfirmation,
    payonline,
    orderFailed,
    payonlineFailed
}


