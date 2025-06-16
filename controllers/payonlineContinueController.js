const Order = require('../models/orderModel');


// --------------------Payonline continue ---------------------//

const payOnlineContinue = async (req, res) => {
    try {
        const { orderId } = req.query
        console.log(orderId)
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.paymentFailed && order.orderStatus === "Pending") {
            order.paymentFailed = false;
            order.orderStatus = "Shipped";

            await order.save();

            return res.redirect("/order-Confirmation")
        } else {
            return res.status(400).json({ message: "Order is not eligible for payment continuation" });
        }
    } catch (error) {
        console.error('Error in continuing payment:', error);
        res.status(500).json({ message: 'Server error' });
    }
};



module.exports = {
    payOnlineContinue
}