
const express = require("express");
const admin_route = express();
const PDFDocument = require('pdfkit');
const { salesReport, salesReportPDF,salesReportExcel } = require('../controllers/adminController');
const offerController = require("../controllers/offerController")
const adminController = require("../controllers/adminController");
const productController = require("../controllers/productController");
const categoryController = require("../controllers/categoryController");
const couponController = require("../controllers/couponController");
const orderController = require("../controllers/orderController");
const { upload } = require("../Helpers/multerStorage");
const middleware = require("../middleware/auth");


admin_route.set("view engine", "ejs")
admin_route.set("views", "./views/admin")
admin_route.use(express.static("public"))

admin_route.get('/', adminController.loadLogin)
admin_route.post('/login', adminController.isAdmin)
admin_route.get('/home', middleware.requireAuth, adminController.loadHome);
admin_route.get('/userList',middleware.requireAuth, adminController.userList);
admin_route.get('/productList',middleware.requireAuth, productController.loadProductList);
admin_route.get('/addProduct', middleware.requireAuth,productController.loadAddProducts);
admin_route.get('/categories',middleware.requireAuth, categoryController.loadCategory);
admin_route.post('/categories', middleware.requireAuth,categoryController.loadAddCategory);
admin_route.get('/editcategory', middleware.requireAuth,categoryController.renderEditCategory);
admin_route.post('/editcategory', middleware.requireAuth,categoryController.editCategory);
admin_route.get('/orderlist',middleware.requireAuth,adminController.orderlist);
admin_route.get('/viewOrderDetails',middleware.requireAuth,adminController.viewOrderDetails);
admin_route.post('/orderStatus',middleware.requireAuth,adminController.orderStatus);
admin_route.post('/approveReturn',middleware.requireAuth,adminController.approveReturn);
admin_route.post('/rejectReturn',adminController.rejectReturn);
admin_route.get('/offerManagement',adminController.loadOfferManagementPage);
admin_route.get('/categoryOffers',adminController.categoryOffer);
admin_route.get('/addCoupon',couponController.loadAddCoupon);
admin_route.post('/postCoupon',couponController.addCoupon);
admin_route.post('/updateTotalAmount',couponController.updateTotalAmount);
admin_route.get('/salesReport',adminController.salesReport);
admin_route.get('/salesReportPDF/pdf',adminController.salesReportPDF);
admin_route.get('/salesReportExcel',adminController.salesReportExcel);
admin_route.get('/filtersales',adminController.salesFilter)
admin_route.post('/filtersales',adminController.salesFilter);
admin_route.delete('/coupons',couponController.deleteCoupon);


admin_route.get('/listcategory',categoryController.listCategory);
admin_route.get('/unlistcategory',categoryController.unlistCategory);
admin_route.get('/showunlistedcategory',categoryController.showUnlistedCategory);
admin_route.post('/addProduct', upload.array('files', 5), productController.addProduct);
admin_route.get('/editProduct', productController.renderEditProductPage);
admin_route.post('/editProduct', upload.array('files', 10), productController.editProduct);

admin_route.get('/listProduct', productController.listProduct);
admin_route.get('/unlistProduct', productController.unlistProduct);
admin_route.get('/showunlisted', productController.showUnlisted);

admin_route.get('/Userlist', adminController.userList);
admin_route.post('/toggle-user/:id',middleware.requireAuth,adminController.toggleUserStatus);
// admin_route.get('/category-offers', offerController.getCategoryOffers);
// admin_route.post('/category-offers',offerController.addCategoryOffer);
// admin_route.delete('/category-offers/:id',offerController.deleteCategoryOffer);
// admin_route.get('/categories',offerController.getCategories);



admin_route.get('/logout', adminController.logout);

module.exports = admin_route;


