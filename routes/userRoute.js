const express = require("express");
const user_route = express()
const { isAuthenticated } = require('../middleware/auth');
const middleware = require("../middleware/auth");
const userController = require("../controllers/userController");
const session = require('express-session');
require('dotenv').config();
const passport = require('passport');
const { updateWalletData } = require('../controllers/userController'); // Adjust the path to your controller
const payOnlineContinueController = require("../controllers/payonlineContinueController")
const couponController = require("../controllers/couponController")
const checkOutController = require("../controllers/checkOutController")
const orderController = require("../controllers/orderController")
const wishlistController = require("../controllers/wishlistController")
const paymentController = require("../controllers/paymentController")
const reviewController = require("../controllers/reviewController")
const { checkIfPurchased } = require('../controllers/orderController'); // Import the checkIfPurchased function


require('../middleware/passport');
user_route.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));


user_route.use(passport.initialize());
user_route.use(passport.session());
user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');
user_route.get('/auth/google', userController.googleAuth);
user_route.get('/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/auth/google/failure'
  }), userController.googleAuthCallback)

user_route.get("/auth/google/failure", userController.googleAuthFailure)

const bodyParser = require('body-parser');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }));
user_route.use(express.static("public"));

user_route.get('/register', middleware.isLoggedin, userController.loadRegister)
user_route.post('/register', userController.insertUser)
user_route.get('/login', middleware.isLoggedin, userController.loadLogin)
user_route.get('/logout', userController.logout)

user_route.get('/userProfile', middleware.requirelogin, userController.userProfile);
user_route.get('/editProfile', middleware.requirelogin, userController.editProfile);
user_route.post('/editProfile', middleware.requirelogin, userController.editedProfile);
user_route.post('/updateAddress', middleware.requirelogin, userController.addAddress);
user_route.get('/editAddress', middleware.requirelogin, userController.renderEditAddress);
user_route.post('/editAddress', middleware.requirelogin, userController.editAddress);
user_route.get('/deleteAddress', middleware.requirelogin, userController.deleteAddress);
user_route.get('/profileForgotPassword',middleware.requirelogin, userController.profileForgotPassword);
user_route.post('/update', middleware.requirelogin,userController.updatePassword);
user_route.get('/profileLogout', middleware.requirelogin, userController.profileLogout);
user_route.get('/payOnlineContinue',payOnlineContinueController.payOnlineContinue)

user_route.get('/cart', middleware.requirelogin, userController.loadCart);
user_route.get('/addToCart', userController.addToCart);
user_route.get('/cartRemove', userController.removeItem);
user_route.get('/checkOut', middleware.requirelogin, checkOutController.checkOut);
user_route.post('/checkOut', middleware.requirelogin,checkOutController.checkOut);
user_route.post('/updateCartQuantity', middleware.requirelogin, userController.updateCartQuantity)

user_route.get("/payonlineFailed",middleware.requirelogin,orderController.payonlineFailed);
user_route.get('/order-confirmation', middleware.requirelogin, orderController.orderConfirmation);
user_route.get('/orderFailed',middleware.requirelogin,orderController.orderFailed)
user_route.post('/placeorder', middleware.requirelogin, orderController.placeorder);
user_route.get('/payonline', middleware.requirelogin, orderController.payonline);
user_route.get('/fetchCoupons', couponController.fetchCoupons);
user_route.post('/applyCoupons', couponController.applyCoupons);
user_route.post('/createOrder', paymentController.createOrder);

user_route.post('/forgot-password', userController.forgotPassword);
user_route.get('/reset-password', userController.getResetPassword);
user_route.post('/reset-password', userController.postResetPassword);
user_route.get('/changePassword',middleware.requirelogin,userController.changePassword);
user_route.post('/product/:productId/review',middleware.requirelogin,reviewController.addReview);
user_route.post('/checkCurrentPassword',middleware.requirelogin,userController.checkCurrentPassword);
user_route.delete('/deleteAddress/:id',middleware.requirelogin,checkOutController.deleteAddress)
user_route.post('/addressCheckout', checkOutController.addressCheckout);
user_route.get('/deleteAddressCheckout', checkOutController.addressCheckout);
user_route.get('/categorySearch', userController.categorySelect);
// user_route.get('/shopCategory', userController.shopCategory);
user_route.post('/search', userController.searchBook);
user_route.post('/searchInShop', userController.searchInShop);

user_route.get('/orderDetails', middleware.requirelogin, userController.showOrderDetails)
user_route.post('/cancelOrder', middleware.requirelogin, orderController.cancelOrder);
user_route.post('/returnOrder', middleware.requirelogin, orderController.returnOrder);
user_route.get('/category', userController.filterByCategory);
user_route.get('/wishlist', middleware.requirelogin, wishlistController.loadWishlist);
user_route.post('/wishlist/add', middleware.requirelogin, wishlistController.addToWishlist);
user_route.post('/wishlist/remove', middleware.requirelogin, wishlistController.removeFromWishlist);
user_route.get('/product/:productId')

user_route.get('/home', middleware.requirelogin, userController.loadHome);
user_route.get('/singleProduct', middleware.requirelogin, userController.singleProduct);
user_route.get('/shop', middleware.requirelogin, userController.loadShop);
user_route.post('/login', userController.loginUser);
user_route.get('/verify-otp', userController.verifyOTP);
user_route.post('/verify-otp', userController.verifyOTP);
user_route.get('/resend-otp', userController.resendOTP);
user_route.post('/resend-otp', userController.resendOTP);
user_route.get('/otp-verification', (req, res) => {
  const userId = req.query.userId;
  res.render('otp-verification', { userId, message: "Please check your email for the OTP." });
});
user_route.get('/otp-verification', (req, res) => {
  const { userId, otpExpiry, message } = req.query;
  res.render('otp-verification', { userId, otpExpiry, message });
});



module.exports = user_route;