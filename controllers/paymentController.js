const Razorpay = require('razorpay');
const { RAZORPAY_ID_KEY, RAZORPAY_SECRET_KEY } = process.env;
require("dotenv").config();
const crypto = require('crypto');
const Order = require('../models/orderModel');


//------------------------ Razorpay Instance ---------------------------// 

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_ID_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})


//------------------------ create Razorpay Order -----------------------//

const createOrder = async (req, res) => {
    try {
        const amount = req.body.totalAmount * 100
        const options = {
            amount: amount,
            currency: 'INR',
            receipt: `receipt_${new Date().getTime()}`
        }
        razorpayInstance.orders.create(options,
            (err, order) => {
                if (!err) {
                    res.status(200).send({
                        success: true,
                        msg: 'Order Created',
                        order_id: order.id,
                        amount: amount,
                        key_id: process.env.RAZORPAY_ID_KEY,
                        // key_secret:process.env.RAZORPAY_SECRET_KEY,
                        product_name: req.body.name,
                        description: req.body.description,
                        contact: req.body.contact,
                        name: "vinod K",
                        email: req.body.email
                    });
                }

                else {
                    res.status(400).send({ success: false, msg: 'Something went wrong!' });

                }

            }
        );

    } catch (error) {
        console.log('Error creating order:', error.message);
        res.status(500).send({ success: false, msg: 'Server Error' });
    }
}



module.exports = {
    createOrder,
}