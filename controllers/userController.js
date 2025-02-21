
const User = require("../models/userModel");
const Address = require("../models/addressModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Category = require("../models/categoryModel");
const Order = require('../models/orderModel');
const Wallet = require('../models/walletModel');
const Wishlist = require('../models/wishlistModel');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const jwt = require("jsonwebtoken");
const Passport = require("passport");
require("dotenv").config();

//.............create a token.......................//
const createToken = (user) => {
  const JWT_SECRET = process.env.JWT_SECRET
  return jwt.sign(user, JWT_SECRET, { expiresIn: "24h" })

}

//.......Function to calculate OTP expiry time...//
const otpExpiryTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 10);
  return now;
};


//............... Generate OTP......................//
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

//..............Send OTP to Mail.....................//
const sendOTP = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: "vinuk5001@gmail.com",
        pass: "kead dpcp dhmv pktv"
      },

    });
    const mailOptions = {
      from: {
        name: "First main Project",
        address: "vinuk5001@gmail.com"
      },
      to: email,
      subject: "OTP Verification",
      html: `<p>Your OTP for email verification is <strong>${otp}</strong>. This OTP is valid for 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error.message);
  }
};



//...................Load Register Page.........................//
const loadRegister = async (req, res) => {
  try {
    res.render("registration");
  } catch (error) {
    console.log(error.message);
  }
};

//..................... Load Login Page.........................//
const loadLogin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    console.log(error.message);
  }
}

//......................Load Home Page..........................//
const loadHome = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    // Fetch total product count and listed products
    const totalProducts = await Product.countDocuments({ isListed: true });
    const listedProducts = await Product.find({ isListed: true }).skip(skip).limit(limit).exec();

    // Update product status based on stock
    listedProducts.forEach(product => {
      if (product.stock === 0) {
        product.status = "Out-of-stock";
      }
    })

    // Fetch categories
    const categories = await Category.find();

    // Fetch new arrivals (sort by creation date)
    const newArrivals = await Product.find({ isListed: true })
      .sort({ createdAt: -1 })
      .limit(10);
    console.log("newArrivals", newArrivals);  // Debug log

    // Fetch top selling products (sort by sales count)
    const topSelling = await Product.find({ isListed: true })
      .sort({ salesCount: -1 }) // Adjusted sorting to get top-selling products
      .limit(10)
      .lean();
    console.log("topSelling", topSelling);  // Debug log

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);
    console.log("totalPages", totalPages);  // Debug log
    console.log("listedProducts",listedProducts); 
    // Pass data to the view
    res.render("home", {
      products: listedProducts,      // Corrected variable name here
      categories: categories,
      currentPage: page,
      totalPages: totalPages,
      newArrivals: newArrivals,
      topSelling: topSelling
    });

  } catch (error) {
    console.log("Error fetching data:", error);
    res.status(500).send("An error occurred while loading the home page.");
  }
};



//.....................Category.................................//
const categorySelect = async (req, res) => {
  try {
    const categoryId = req.query.id;

    const categories = await Category.find(); 

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.render('home', { categories, message: "Invalid category", products: [] });
    }

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.render('home', { categories, message: "Category not found", products: [] });
    }

    const products = await Product.find({ category: categoryId });

    res.render('home', { categories, category, products });
  }catch (error){
    console.log("Error in categorySelect:", error.message);
    res.status(500).render('home', { categories: [], error: "Server Error", products: [] })

  }
}



//.....................Load shop................................//
const loadShop = async (req, res) => {
  try {
    let sortOption = req.query.sort || 'nameAsc';
    let sortCriteria;

    switch (sortOption) {
      case 'priceAsc':
        sortCriteria = { price: 1 };
        break;
      case 'priceDesc':
        sortCriteria = { price: -1 };
        break;
      case 'nameAsc':
        sortCriteria = { name: 1 };
        break;
      case 'nameDesc':
        sortCriteria = { name: -1 };
        break;
      default:
        sortCriteria = { name: 1 };
        break;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const categories = await Category.find();
    const categoryId = req.query.id;
    let filterCriteria = { isListed: true, status: "Active" };
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filterCriteria.category = mongoose.Types.ObjectId(categoryId);
    }
    const totalProducts = await Product.countDocuments({ filterCriteria });

    const products = await Product.find({ isListed: true, status: "Active" })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate("category")

   const totalPages = Math.ceil(totalProducts / limit);

   const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("shop", {
      product: products,
      sortOption: sortOption,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      categories: categories,
      pageNumbers: pageNumbers // Pass the array to the view
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred while loading the shop page.");
  }
};

const shopCategory = async (req, res) => {
  try {
    const categoryId = req.query.category;  // Use category ID here
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const categories = await Category.find();
    if (!Array.isArray(categories)) {
      return res.status(500).send({ error: 'Categories data is not in the expected format' });
    }
    const totalProducts = await Product.countDocuments({ category: categoryId, isListed: true, status: "Active" });
    const products = await Product.find({ category: categoryId, isListed: true, status: "Active" })
      .skip(skip)
      .limit(limit);
    const totalPages = Math.ceil(totalProducts / limit);
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    res.render("shop", {
      product: products,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      categories: categories,  
      pageNumbers: pageNumbers,
      categoryId: categoryId 
    })
  } catch (error) {
    console.error("Error occurred while filtering products by category:", error)
    res.status(500).send({ error: 'An error occurred while filtering products by category' })
  }
}





const insertUser = async (req, res) => {
  try {
    const { username, email, password, mobile_number, confirmpassword } = req.body;
    if (password !== confirmpassword) {
      return res.render('registration', { message: "Passwords do not match" });
    }
    const spassword = await securePassword(password);
    const otp = generateOTP();
    const otpExpiry = otpExpiryTime();

    const user = new User({
      username,
      email,
      mobile_number,
      password: spassword,
      otp,
      otp_expiry: otpExpiry
    });
    console.log(user)
    const userData = await user.save();

    if (userData) {
      await sendOTP(email, otp);
      res.redirect(`/otp-verification?userId=${userData._id}&otpExpiry=${otpExpiry.getTime()}`);
    } else {
      res.render('registration', { message: "Your registration has failed" });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred during registration");
  }
}



const verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.render('otp-verification', { userId: null, message: "Invalid OTP or OTP has expired." });
    }

    if (!ObjectId.isValid(userId)) {
      return res.render('otp-verification', { userId: null, message: "Invalid user ID." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.render('otp-verification', { userId: null, message: "User not found." });
    }

    if (user.otp !== otp || user.otp_expiry < new Date()) {
      return res.render('otp-verification', { userId: userId, message: "Invalid OTP or OTP has expired." });
    }

    user.is_verified = 1;
    user.otp = '';
    user.otp_expiry = null;
    await user.save();

    res.redirect('/login');
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred during OTP verification.");
  }
}

const resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (user.otp && user.otp_expiry > new Date()) {
      await sendOTP(user.email, user.otp);
      return res.json({ success: true, message: "The existing OTP has been resent.", otpExpiry: user.otp_expiry.getTime() });
    }

    const otp = generateOTP();
    const otpExpiry = otpExpiryTime();

    user.otp = otp;
    user.otp_expiry = otpExpiry;
    await user.save();

    await sendOTP(user.email, otp);
    res.json({ success: true, message: "A new OTP has been sent to your email.", otpExpiry: otpExpiry.getTime() });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: "An error occurred while resending OTP." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {

        if (user.is_blocked) {
          return res.status(403).send({ message: "Your acoount is blocked:" });
        }
        const token = createToken({ id: user._id });
        res.cookie("jwt", token, {
          httpOnly: true,
          maxAge: 60 * 60 * 1000 * 24,  // 24 hours expiration
        });
        return res.redirect("/home");
      } else {
        return res.render('login', { message: "Invalid email or password" });
      }
    } else {
      return res.render('login', { message: "Invalid email or password" });
    }
  } catch (error) {
    console.log("Error during login:", error);
    res.status(500).send("An error occurred during login");
  }
};





const singleProduct = async (req, res) => {
  try {
    const { id } = req.query;
    const product = await Product.findOne({ _id: id });
    if (!product) {
      return res.status(404).send("Product not found");
    }
    const relatedProducts = await Product.find({ category: product.category });
    let isInWishlist = false;
    let isInCart = false;
    let userId = null;
    const token = req.cookies.jwt;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    const wishlist = await Wishlist.findOne({ user: userId });
      if (wishlist && wishlist.items.some(item => item.productId.toString() === id)) {
        isInWishlist = true;
      }
      const cart = await Cart.findOne({ userId: userId });
      if (cart && cart.Product && Array.isArray(cart.Product)) {
        isInCart = cart.Product.some(item => item.productId.toString() === product._id.toString());
      }
    }

    res.render("singleProduct", {
      products: product,
      relatedProducts: relatedProducts,
      isInWishlist: isInWishlist,
      isInCart: isInCart,
    });

  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred while loading the product details.");
  }
}


//............................Logout load Page..........................//

const logout = async (req, res) => {
  try {
    res.clearCookie('jwt');
    res.redirect('/login');
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occurred during logout");
  }
};

//.............................userProfile.................................// 

const userProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const addresses = await Address.find({ userId });
    const saveData = await User.findById(userId)
    const address = await Address.find({ user: userId });
    const orders = await Order.find({ user: userId }).populate('items.product').sort({ orderDate: -1 })


    let walletData = await Wallet.findOne({ user: userId })
    if (!walletData) {
      walletData = new Wallet({ user: userId, walletBalance: 0, transactions: [] });
      await walletData.save();
    }
    const orderid = req.query.id
    res.render('userProfile', { user: userId, address: addresses, order: orders, saveData: saveData, walletData: walletData });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("something went wrong");
  }
};


const editProfile = async (req, res) => {
  try {
    const users = req.user.id;
    const saveData = await User.findById(users)
    res.render('editProfile', { user: saveData });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("something went wrong");
  }
}


const editedProfile = async (req, res) => {
  try {
    const { id, name, email, mobile_number } = req.body;
    if (!name || name.length < 3) {
      return res.status(400).send('Username must be at least 3 characters long.');
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).send('Invalid email address.');
    }

    if (!mobile_number || !/^[0-9]{10}$/.test(mobile_number)) {
      return res.status(400).send('Invalid mobile number.');
    }
    const updateData = {
      username: name,
      email: email,
      mobile_number: mobile_number
    }
    const saveData = await User.findByIdAndUpdate(id, updateData, { new: true });

    res.redirect("/userProfile");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("something went wrong");
  }
}

const addAddress = async (req, res) => {
  try {
    const { address, city, state, pincode } = req.body;
    const userId = req.id.id
    const userAddress = new Address({
      userId: userId,
      address: address,
      city: city,
      state: state,
      pincode: pincode,
      user: userId
    })

    const saveAddress = await userAddress.save();
    const user = await User.findById(userId);
    // user.addresses.push(saveAddress._id);
    await user.save();
    res.redirect("/userProfile");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}




const renderEditAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).send("Address not found");
    }
    res.render('editAddress', { address: address });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Something went wrong");
  }
};


const editAddress = async (req, res) => {
  try {
    let { address, city, state, pincode, addressId } = req.body;
    let updateData = {
      address: address,
      city: city,
      state: state,
      pincode: pincode
    }
    const updateAddress = await Address.findByIdAndUpdate(addressId, updateData, { new: true })
    if (!updateAddress) {
      return res.status(404).send("Address not found");
    }
    res.redirect("/userProfile");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("server Error");
  }
}

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.addressId;
    const userId = req.id.id;
    const address = await Address.findByIdAndDelete(addressId);
    if (!address) {
      return res.status(404).send("Address not found");
    }
    const userData = await User.findByIdAndUpdate(userId,
      {
        $pull: { addresses: addressId }
      })
    res.redirect("/userProfile");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Something went wrong");
  }
};



const loadCart = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      throw new Error('JWT cookie not found');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const cartItems = await Cart.aggregate([
      {
        $match: { userId: userId }
      },
      {
        $unwind: "$Product"
      },
      {
        $lookup: {
          from: "products",
          localField: "Product.productId",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      {
        $unwind: "$productDetails"
      },
      {
        $lookup: {
          from: "categories",
          localField: "productDetails.category",
          foreignField: "_id", 
          as: "categoryDetails"
        }
      },
      {
        $unwind: "$categoryDetails"
      },
      {
        $project: {
          _id: 0,
          subtotal: { $multiply: ["$Product.quantity", "$productDetails.price"] },
          product: "$productDetails",
          quantity: "$Product.quantity",
          categoryName: "$categoryDetails.name"
        }
      }
    ]);
    const categories = await Category.find();
    const totalAmount = cartItems.reduce((acc, item) => acc + item.subtotal, 0);
    res.render('cart', { cartItems:cartItems, totalAmount, categories });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("An error occurred while loading the cart.");
  }
};


const addToCart = async (req, res) => {

  try {
    const token = req.cookies.jwt;
    if (!token) {
      throw new Error('JWT cookie not found');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("decoded",decoded);
    
    const userId = decoded.id;
    console.log("userId",userId);
    
    const productId = req.query.productId;
    console.log("productId",productId);
    
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }
    const objectIdProductId = new mongoose.Types.ObjectId(productId);
    console.log("objectIdProductId",objectIdProductId);
    
    const product = await Product.findById(objectIdProductId);
    console.log("product", product);
    
    if (!product) {
      throw new Error('Product not found');
    }
     const discountedPrice = product.discount ? product.price * (1 - product.discount/100):product.price;
     console.log("discountedPrice", discountedPrice);
       
    // console.log("productId", productId.toString());
    // console.log("objectIdProductId", objectIdProductId.toString());

    let cart = await Cart.findOne({ userId: userId });
    console.log("cart", cart)
    let isProductIncart = false;
    if (!cart) {
      cart = new Cart({
        userId: userId,
        Product: [{ 
          productId: objectIdProductId,
           quantity: 1,price:discountedPrice }]
      })
    } else {
      const existingProduct = cart.Product.find(
        item => item.productId.toString() === objectIdProductId.toString()
      )

      if (existingProduct) {
        if (existingProduct.quantity >= product.stock || product.stock === 0 || product.status === 'Out-of-stock') {
          return res.status(400).json({ message: "Out of stock" });
        }
        existingProduct.quantity += 1;
        existingProduct.price = discountedPrice;
      } else {
        cart.Product.push({ productId: objectIdProductId, quantity: 1 ,price:discountedPrice});
      }
    }

    let wishlist = await Wishlist.findOne({ user: userId });
    if (wishlist) {
      wishlist.items = wishlist.items.filter(item => item.productId.toString() !== productId.toString());
      await wishlist.save();
    }

    await cart.save();

    res.redirect("/cart");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("An error occurred while adding to cart.");
  }
}


const updateCartQuantity = async (req, res) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ success: false, message: 'JWT cookie not found' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    console.log("userId: " + userId);
     
    const { productId, quantity } = req.body;
    console.log("requested",req.body);
    

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return res.status(400).json({ success: false, message: 'Invalid quantity value' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, message: 'Not enough stock available' });
    }

    const cart = await Cart.findOne({ userId: userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    const cartItemIndex = cart.Product.findIndex(item => item.productId.toString() === productId);
    if (cartItemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' });
    }

    cart.Product[cartItemIndex].quantity = quantity;
    let totalAmount = 0;
    cart.Product.forEach(item => {
      const itemProduct = item.productId;
      if (itemProduct) {
        const discountedPrice = itemProduct.price - (itemProduct.price * (itemProduct.discount / 100));
        if (isNaN(discountedPrice)) {
          console.log(`Invalid discounted price for product ${itemProduct._id}`);
          return; 
        }
        const itemSubtotal = discountedPrice * item.quantity;        
        if (isNaN(itemSubtotal)) {
          console.log(`Invalid subtotal for product ${itemProduct._id}`);
          return; 
        }

        totalAmount += itemSubtotal;

        if (item.productId.toString() === productId) {
          item.subtotal = itemSubtotal;
        }
      }
    });
    if (isNaN(totalAmount)) {
      console.log('Invalid total amount calculation');
      return res.status(500).json({ success: false, message: 'Invalid total amount calculation' });
    }


    cart.totalAmount = totalAmount;
    await cart.save();
    res.json({
      success: true,
      totalAmount: totalAmount,
      subtotal: cart.Product[cartItemIndex].subtotal
    });

  } catch (error) {
    console.error("Error updating cart quantity:", error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}




const removeItem = async (req, res) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({ success: false, message: 'JWT cookie not found' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const productId = req.query.productId;
    const cart = await Cart.findOne({ userId: userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }
    const cartItemIndex = cart.Product.findIndex(item => item.productId.toString() === productId);
    if (cartItemIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found in cart' });
    }
    cart.Product.splice(cartItemIndex, 1);
    let totalAmount = 0;
    for (let item of cart.Product) {
      const product = await Product.findById(item.productId);
      if (product) {
        totalAmount += product.price * item.quantity;
      }
    }
    cart.totalAmount = totalAmount;
    await cart.save();

    res.redirect('/cart');
    // res.json({ success: true, updatedCart: cart, totalAmount: totalAmount });

  } catch (error) {
    console.error("Error removing item from cart:", error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}



const getResetPassword = (req, res) => {
  const { token } = req.query;
  res.render('resetPassword', { token, message: '' });
};


const forgotPassword = async (req, res) => {
  const { forgotEmail } = req.body;
  try {
    const user = await User.findOne({ email: forgotEmail });
    if (!user) {
      return res.status(404).json({ message: 'No user with that email' });
    }

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'vinuk5001@gmail.com',
        pass: "kead dpcp dhmv pktv",
      },
    });

    const resetLink = `${process.env.BASE_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: 'vinuk5001@gmail.com',
      to: forgotEmail,
      subject: 'Password Reset',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
        `Please click on the following link, or paste this into your browser to complete the process:\n\n` +
        `${resetLink}\n\n` +
        `If you did not request this, please ignore this email and your password will remain unchanged.\n`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'A password reset link has been sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while trying to reset the password.' });
  }
}


const postResetPassword = async (req, res) => {
  const { token } = req.body; // Get the token from the form data
  const { password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).render('resetPassword', { token, message: "Passwords do not match" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });

    if (!user) {
      return res.status(400).send('Password reset token is invalid or has expired');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while resetting the password.');
  }
};



const changePassword = async (req, res) => {
  try {
    res.render("checkCurrentPassword");
  } catch (error) {
    console.log("Error in changePassword function", error);
    res.status(500).send("Internal server error"); ``
  }
}



const checkCurrentPassword = async (req, res) => {
  try {
    const { password } = req.body
    const token = req.cookies.jwt;
    if (!token) {
      throw new Error('JWT cookie not found');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.render('checkCurrentPassword', { error: "Current password is incorrect" });
    }
    res.render('profileChangePassword', { error: null });
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal server error");
  }
}


const profileForgotPassword = async (req, res) => {
  try {
    res.render("profileChangePassword");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal server error");
  }
}


const updatePassword = async (req, res) => {
  try {

    const token = req.cookies.jwt;
    if (!token) {
      throw new Error('JWT cookie not found');
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;
    const user = await User.findById(userId);
    const newPassword = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if (newPassword !== confirmPassword) {
      return res.render('profileChangePassword', { message: "Error: Passwords do not match." });
    }


    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    res.redirect('/userProfile');
  } catch (error) {
    console.error("Error in profileForgotPassword:", error.message);
    res.status(500).send("Internal server error");
  }
}



const profileLogout = (req, res) => {
  try {
    res.clearCookie('jwt');
    res.redirect("/login");
    res.render("profileLogout");
  } catch (error) {
    console.log(error.message);
    res.status(500).send("An error occured during logout");
  }
}



const searchBook = async (req, res) => {
  try {
    const { search,page = 1} = req.body;
    const categories = await Category.find()
    const regex = new RegExp(search, 'i');
    const limit = 12;
    const skip = (page - 1)* limit
    const products = await Product.find({ name: { $regex: regex } })
    .skip(skip)
    .limit(limit)
    const newArrivals = await Product.find({isListed:true})
    .sort({createdAt:-1})
    .limit(10)
    const topSelling = await Product.find({isListed:true})
    .sort({salesCount:-1})
    .limit(10);
    const totalProducts = await Product.countDocuments({name:{$regex:regex}});
    const totalPages = Math.ceil(totalProducts/limit);
    res.render('shop', 
      { 
         categories:categories,
         product:products, 
         newArrivals:newArrivals, 
         topSelling:topSelling ,
         limit: limit,
         currentPage:page,
         totalPages:totalPages,
         pageNumbers: Array.from({ length: totalPages }, (_, i) => i + 1)

        })
  } catch (error) {
    console.error('Error occurred while searching for products:', error);
    res.status(500).send({ error: 'An error occurred while searching for products' });
  }
}

const searchInShop = async (req, res) => {
  try {
    console.log("hiiiii");
    const { search } = req.body;
    console.log("requested",req.body);
    const categories = await Category.find();
    console.log("categories",categories);
    const regex = new RegExp(search, 'i');
    console.log("regex",regex);
    const products = await Product.find({ name: { $regex: regex } });
    console.log("products",products);
    const page = parseInt(req.query.page) || 1;
    console.log("page",page);
    const limit = parseInt(req.query.limit) || 10;
    console.log("limit",limit);
    const skip = (page - 1) * limit;
    console.log("skip",skip);
    const totalProducts = await Product.countDocuments({ name: { $regex: regex } });
    console.log("totalproducts",totalProducts);
    const totalPages = Math.ceil(totalProducts / limit);
    console.log("totalPages",totalPages);

    res.render('shop', {
      product: products,
      sortOption: req.query.sort || 'nameAsc',
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      categories: categories,
      pageNumbers: Array.from({ length: totalPages }, (_, i) => i + 1)
    });
  } catch (error) {
    console.error('Error occurred while searching for products:', error);
    res.status(500).send({ error: 'An error occurred while searching for products' });
  }
};

const showOrderDetails = async (req, res) => {
  try {
    const orderId = req.query.orderid;
    const { addressId } = req.body;
    console.log(addressId);
    const address = await Address.findById(addressId)
    if (!orderId) {
      return res.status(404).send('Order ID is required')
    }
    const order = await Order.findById(orderId).populate('items.product').populate('shippingAddress')
    console.log("shippingAddress", order.shippingAddress)

    res.render("orderDetails", { order,address })
  } catch (error) {
    console.error("Error in showOrderDetails:", error)
    res.status(500).send('Server Error')
  }
}


const filterByCategory = async (req, res) => {
  try {

    const categoryId = req.query.id
    const categories = await Category.find()
    const selectedCategory = await Category.findById(categoryId);

    if (!selectedCategory) {
      return res.render("home", { categories, message: "Category not found", products: [] });
    }

    const products = await Product.find({ category: categoryId, isListed: true, status: "Active" }).populate('category');
    res.render("home", { categories: categories, selectedCategory, product: products });
  } catch (error) {
    console.error("Error occurred while filtering products by category:", error);
    res.status(500).send({ error: 'An error occurred while filtering products by category' });
  }
}


const googleAuth = Passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account"
})



const googleAuthCallback = async (req, res) => {
  const user = req.user;
  if (!user) {
    const errorMessage = "Authentication failed, user data is missing."
    return res.render("login", {
      errorMessage,
      pageTitle: "Login Page"
    });
  }


  const token = createToken({ id: user._id });
  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: 60 * 60 * 1000 * 24,
  });

  return res.redirect("/home");
};

const googleAuthFailure = async (req, res) => {
  try {
    const errorMessage = "User is blocked. Please contact support."
    res.render("login", {
      errorMessage,
      pageTitle: "Login Page"
    });
  } catch (error) {
    const errorMessage = "An unexpected error occurred. Please try again later."
    res.redirect(`/login?error=${errorMessage}`);
  }
};




module.exports = {
  loadRegister,
  loadLogin,
  insertUser,
  verifyOTP,
  resendOTP,
  loadHome,
  loginUser,
  singleProduct,
  logout,
  loadShop,
  shopCategory,
  userProfile,
  editProfile,
  editedProfile,
  addAddress,
  renderEditAddress,
  loadCart,
  addToCart,
  removeItem,
  forgotPassword,
  getResetPassword,
  postResetPassword,
  deleteAddress,
  editAddress,
  profileForgotPassword,
  changePassword,
  checkCurrentPassword,
  updatePassword,
  profileLogout,
  updateCartQuantity,
  categorySelect,
  searchBook,
  showOrderDetails,
  searchInShop,
  filterByCategory,
  googleAuthCallback,
  googleAuthFailure,
  googleAuth,

};
