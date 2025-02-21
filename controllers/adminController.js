const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const Order = require("../models/orderModel");
const Address = require("../models/addressModel");
const Category = require("../models/categoryModel");
const { OrderedBulkOperation } = require("mongodb");
const ExcelJS = require('exceljs')
dotenv.config()
const secret = process.env.JWT_SECRET;
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { parse } = require("path");

//---------Admin Login ------------//
const loadLogin = (req, res) => {
    res.render('login');
}

//---------Create JWT Token---------//
const createToken = (user) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

//----------Admin Authentication------//
const isAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email: email, is_admin: 1 });
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                const token = createToken({ id: admin._id });
                res.cookie("admin", token, {
                    httpOnly: true,
                    maxAge: 30 * 24 * 60 * 60 * 1000,
                    secure: process.env.NODE_ENV === 'production',
                });
                return res.status(200).json({ message: "Login successful", token });
            } else {
                res.status(400).json({ error: "Invalid email or password" })
            }
        } else {
            res.status(400).json({ error: "Invalid email or password" });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ error: "Something went wrong. Please try again later." });
    }
}

//------------Admin Logout-------------//
const logout = async (req, res) => {
    try {
        res.clearCookie('token');
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
        res.render('error', { message: "Something went wrong." });
    }
}

//-----------Admin Home-----------------//
const loadHome = async (req, res) => {
    try {
        const products = await Order.aggregate([
            {$unwind:"$items"},
            {
              $group:{
                _id:{
                    productId:"$items.product._id",
                    name :"$items.product.name",
                    image:{$arrayElemAt:["$items.product.images",0]},
                    price:"$items.product.price"
                },
                totalQuantity:{$sum:"$items.quantity"}
              }   
            },
            {$sort:{totalQuantity:-1}},
            {$limit:5}
        ])

        const categories = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "categories", 
                    localField: "items.product.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: { path: "$categoryInfo", preserveNullAndEmptyArrays: true } }, 
            {
                $group: {
                    _id: "$categoryInfo.name", 
                    totalQuantity: { $sum: "$items.quantity" } 
                }
            },
            { $sort: { totalQuantity: -1 } }, 
            { $limit: 5 } 
        ]);
        const salesOrder = await Order.aggregate([
            {
                $project:{
                    _id:0,
                    billTotal:1,
                    createdAt:1
                }
            }
        ])
        console.log("salesOrder",salesOrder);

        const totalSales = salesOrder.reduce((total,order)=> total + order.billTota,0);
        console.log("totalSales",totalSales);
        const orderDates = salesOrder.map(order => order.createdAt); 
        console.log("orderDates",orderDates);
      const overallStats = {
        totalSales : await Order.aggregate([
            {$group:{_id:null,totalSales: {$sum:"$billTotal"}}}
        ]),
        totalOrders: await Order.countDocuments(),
        totalRevenue: await Order.aggregate([
            {$group:{_id:null,totalRevenue:{$sum:"$billTotal"}}}
        ])      
      }  
      console.log("overallStats",overallStats);

      const totalSalesFromDb = overallStats.totalSales[0]?.totalSales || 0;
      console.log("totalSalesFromDb", totalSalesFromDb);

         return res.render("home",{products:products,categories:categories,salesOrder:salesOrder,overallStats:overallStats,totalSales:totalSalesFromDb,orderDates:orderDates});
    } catch (error) {
        console.log(error.message);
        if(!res.headersSent){
        return res.render('login', { error: "Session expired. Please log in again." });
        }
    }
}

//-----------User List-----------------//
const userList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 5
        const skip = (page - 1) * limit;
        const totalUsers = await User.countDocuments({ is_admin: 0 });
        const userData = await User.find({ is_admin: 0 }).skip(skip).limit(limit);
        res.render("Userlist", {
            users: userData,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            limit: limit
        })
    } catch (error) {
        console.log(error.message);
        res.render("Userlist", { error: "Something went wrong. Please try again later." });
    }
}


const toggleUserStatus = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        user.is_blocked = !user.is_blocked
        user.markModified('is_blocked');
        await user.save();

        return res.status(200).json({
            message: `${user.username} has been ${user.is_blocked ? 'blocked' : 'unblocked'} successfully`,
            isBlocked: user.is_blocked
        })

    } catch (error) {
        console.error('Error in toggleUserStatus:', error);
        res.status(500).json({ error: 'Server Error' })
    }

}


const orderlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page)||1
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments()
        const orders = await Order.find().skip(skip).limit(limit).populate('items.product');
        const totalPages = Math.ceil(totalOrders/limit);
        res.render('orderlist', { 
            orders: orders,
            currentPage:page,
            totalPages:totalPages,
            limit:limit,
         })
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
}



const viewOrderDetails = async (req, res) => {
    try {
        const orderId = req.query.orderId;
        if (!orderId) {
            return res.status(400).send('Order ID is required')
        }
        const order = await Order.findOne({ _id: orderId })
        if (!order) {
            console.log("Order not found with ID:",orderId)
            return res.status(404).send('Order not found')
        }
       const address = await Address.findById({ _id: order.shippingAddress })
        if(!address){
            console.log("Address not found for order:",orderId)
            return res.status(404).send("Address not found")
        }    
         const user = await User.findById({ _id: order.user })
            console.log("user",user);
         if(!user){
            console.log("User not found for order:",orderId)
            return res.status(404).send("User not found")
         } 
        const returnReason = order.returnReason || '';
         res.render('viewOrderDetails', { order, address, user, returnReason })
    } catch (error) {
        console.error("Error in viewOrderDetails:",error)
        res.status(500).send('Server Error')
    }

}

const orderStatus = async (req, res) => {
    try {
        const { orderId, orderStatus } = req.body;
        const order = await Order.findById(orderId);
        order.orderStatus = orderStatus;
        await order.save();
        res.json({ success: true, message: 'Order status updated successfully' });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const approveReturn = async (req, res) => {
    const { orderId, reason, isReturnApproved } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (order) {
            order.returnRequested = true;
            order.returnReason = reason;

            order.isReturnApproved = true;
            order.orderStatus = "Returned"

            await order.save();

            res.redirect(`/admin/viewOrderDetails?orderId=${orderId}`);
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {
        console.error('Error processing return request:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const rejectReturn = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send("Order not found");
        }
        order.isReturnApproved = false;
        await order.save();
        res.status(200).send("Return request rejected successfully");
    } catch (error) {
        console.log(error);
        res.status(500).send("Server Error");
    }
};



const loadOfferManagementPage = async (req, res) => {
    try {
        res.render("offerManagement")
    } catch (error) {
        console.log(error);
    }
}

const categoryOffer = async (req, res) => {
    try {
        res.render("categoryOffers")
    } catch (error) {
        console.log(error)
    }
}

const salesReport = async (req, res) => {
    try {

        const {startDate,endDate} = req.query;

        if(startDate &&isNaN(new Date(startDate))){
            return res.status(400).json({error:"Invalild start date format"});
        }
        if(endDate && isNaN(new Date(endDate))){
            return res.status(400).json({error:"Invalid end date format"});
        }

        const filterconditions = {}; 
        if(startDate) filterconditions.createdAt = {...filterconditions.createdAt,$gte:new Date(startDate)}
        if(endDate) filterconditions.createdAt = {...filterconditions.createdAt,$lte:new Date(endDate)};
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;
        const totalOrders = await Order.countDocuments(filterconditions);
        
        const salesOrder = await Order.find(filterconditions)
            .sort({createdAt:-1})
            .skip(skip)
            .limit(limit)
            .populate('items.product');  
        
        salesOrder.forEach(order => {
            order.items.forEach(item => {
                console.log("Item Product: ", item.product);  
            });
        });

        const totalAmount = salesOrder.reduce((acc, item) => acc + (item.billTotal, 0),0);
        const totalPages = Math.ceil(totalOrders / limit);

        res.render("salesReport", {
            salesOrder: salesOrder,
            totalAmount: totalAmount,
            currentPage: page,
            totalPages: totalPages,
            totalOrders: totalOrders,
            limit: limit,
            startDate:req.query.startDate || "",
            endDate :req.query.endDate || ""
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error fetching orders');
    }
}



const salesFilter = async (req, res) => {
    try {
        console.log("Filtering sales...");

        let { startDate, endDate, page } = req.body;
        console.log("Start Date:", startDate);
        console.log("End Date:", endDate);

        if (!startDate || !endDate) {
            console.log("❌ Missing Date Values");
            return res.status(400).json({ error: "Start date and end date are required" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        console.log("Parsed Start Date:", start);
        console.log("Parsed End Date:", end);

        start.setHours(0, 0, 0, 0); 
        end.setHours(23, 59, 59, 999); 

        console.log(`✅ Querying sales from: ${start} to ${end}`);

        const limit = 5;
        const currentPage = parseInt(page) || 1;

        const totalOrders = await Order.countDocuments({
            createdAt: { $gte: start, $lte: end }
        });

        const sales = await Order.find({
            createdAt: { $gte: start, $lte: end }
        })
        .sort({ createdAt: 1 })
        .skip((currentPage - 1) * limit)
        .limit(limit);

        console.log(`🔹 Found ${sales.length} sales`);

        const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);
        const totalAmount = sales.reduce((acc, order) => acc + order.billTotal, 0);

        res.render('salesReport', { 
            salesOrder: sales,
            totalAmount,
            currentPage,
            totalPages,
            totalOrders,
            startDate,
            endDate
        });

    } catch (error) {
        console.error("🔥 Error in sales filter:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};


const salesReportPDF = async (req, res) => {
    try {
        console.log("Full request:", req);
        console.log("Query Params:", req.query);
        const { startDate, endDate } = req.query;

        console.log("Received Query Parameters:", req.query);
        console.log('Start Date:', startDate);
        console.log('End Date:', endDate);

        // Validation for missing startDate or endDate
        if (!startDate || !endDate) {
            console.log("❌ Missing Date Values");
            return res.status(400).json({ error: "Start date and end date are required" });
        }

        // Check if startDate and endDate are valid date strings
        if (isNaN(new Date(startDate)) || isNaN(new Date(endDate))) {
            console.log("❌ Invalid Date Format");
            return res.status(400).json({ error: "Invalid date format" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Log parsed dates to ensure correctness
        console.log(`Parsed Start Date: ${start}`);
        console.log(`Parsed End Date: ${end}`);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        console.log(`✅ Querying sales from: ${start} to ${end}`);

        const limit = 5;
        const currentPage = parseInt(req.query.page) || 1;

        // Debugging: Log page and limit for pagination
        console.log(`Pagination - Current Page: ${currentPage}, Limit: ${limit}`);

        // Query to get total order count within the date range
        const totalOrders = await Order.countDocuments({
            createdAt: { $gte: start, $lte: end }
        });
         
        console.log(`Total Orders Found: ${totalOrders}`);
                
        // Fetching sales data within the given date range and pagination
        const sales = await Order.find({
            createdAt: { $gte: start, $lte: end }
        })
            .sort({ createdAt: 1 })
            .skip((currentPage - 1) * limit)
            .limit(limit)
            .populate('items.product'); // Populate product details
          
        console.log(`Sales Data Fetched: ${sales.length} orders`);

        // If no sales data is found, inform the user
        if (sales.length === 0) {
            return res.status(404).json({ error: 'No sales data found for the given date range' });
        }

        // Calculate the total amount of all orders in the fetched sales data
        const totalAmount = sales.reduce((acc, order) => acc + order.billTotal, 0);
        console.log(`Total Amount of Sales: ₹${totalAmount.toFixed(2)}`);

        // PDF generation logic...
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path');

        const filePath = path.join(__dirname, '../public/reports/sales_report.pdf');
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Add the report header
        doc.fontSize(16).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
        doc.moveDown(1);

        // Add table headers
        const colWidths = [180, 100, 100, 80];
        const colX = [50, 240, 350, 460];
        const rowHeight = 35;

        const headerY = doc.y;
        doc.fillColor('#eeeeee').rect(50, headerY, 490, rowHeight).fill();
        doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
        doc.text('Products', colX[0], headerY + 12, { width: colWidths[0], align: 'left' });
        doc.text('Date', colX[1], headerY + 12, { width: colWidths[1], align: 'center' });
        doc.text('Status', colX[2], headerY + 12, { width: colWidths[2], align: 'center' });
        doc.text('Total Amount', colX[3], headerY + 12, { width: colWidths[3], align: 'right' });

        doc.moveTo(50, headerY + rowHeight).lineTo(540, headerY + rowHeight).stroke();
        doc.moveDown(1.5);

        // Populate rows with data
        let rowCount = 0;
        sales.forEach((order) => {
            // Concatenate product names from items array
            const productNames = order.items.map(item => item.product?.name || 'Unknown Product').join(', ');
            const currentY = doc.y;

            if (rowCount % 2 === 0) {
                doc.fillColor('#f9f9f9').rect(50, currentY, 490, rowHeight).fill();
            }

            doc.fillColor('black');
            doc.text(productNames, colX[0], currentY + 12, { width: colWidths[0], align: 'left' });
            doc.text(new Date(order.orderDate).toLocaleDateString(), colX[1], currentY + 12, { width: colWidths[1], align: 'center' });
            doc.text(order.orderStatus, colX[2], currentY + 12, { width: colWidths[2], align: 'center' });
            doc.text(`₹${order.billTotal.toFixed(2)}`, colX[3], currentY + 12, { width: colWidths[3], align: 'right' });

            doc.moveTo(50, currentY + rowHeight).lineTo(540, currentY + rowHeight).stroke();
            rowCount++;
            doc.moveDown(2);
        });

        // Finalize the document
        doc.end();

        stream.on('finish', () => {
            console.log('PDF generated successfully');
            res.download(filePath, 'sales_report.pdf', (err) => {
                if (err) console.error('Download Error:', err);
            });
        });

    } catch (error) {
        console.error("🔥 Error generating PDF:", error);
        res.status(500).send('Error generating PDF');
    }
}





const salesReportExcel = async (req, res) => {
    try {
        const salesOrder = await Order.find().sort({ orderDate: -1 }).populate('items.product');
        const totalAmount = salesOrder.reduce((acc, item) => acc + item.billTotal, 0);
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');
        worksheet.columns = [
            { header: 'Product Name', key: 'productName', width: 30 },
            { header: 'Order Date', key: 'orderDate', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Total', key: 'total', width: 15 }
        ];
        salesOrder.forEach(saleOrder => {
            saleOrder.items.forEach(item => {
                worksheet.addRow({
                    productName: item.product && item.product.name ? item.product.name : 'Product not available',
                    orderDate: new Date(saleOrder.orderDate).toLocaleDateString(),
                    status: saleOrder.orderStatus,
                    total: saleOrder.billTotal.toFixed(2)
                });
            });
        });

        worksheet.addRow({});
        worksheet.addRow({
            productName: 'Total Amount',
            total: totalAmount.toFixed(2)
        });

        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).send('Error generating Excel report');
    }
}



const getSalesStats = async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();

        // 1️⃣ Aggregate Monthly Sales
        const monthlySales = await Order.aggregate([
            {
                $match: { createdAt: { $gte: new Date(`${currentYear}-01-01`), $lt: new Date(`${currentYear + 1}-01-01`) } }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalSales: { $sum: "$billTotal" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // 2️⃣ Aggregate Yearly Sales for Last 5 Years
        const yearlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    totalSales: { $sum: "$billTotal" }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({ monthlySales, yearlySales });
    } catch (error) {
        console.error("Error fetching sales statistics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};





module.exports = {
    loadLogin,
    isAdmin,
    loadHome,
    userList,
    toggleUserStatus,
    logout,
    orderlist,
    viewOrderDetails,
    orderStatus,
    approveReturn,
    rejectReturn,
    loadOfferManagementPage,
    categoryOffer,
    salesReport,
    salesReportPDF,
    salesReportExcel,
    salesFilter,
    getSalesStats
}
