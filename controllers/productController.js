const Product = require('../models/productModel');
const User = require('../models/userModel');
const categoryModel = require("../models/categoryModel");
const { upload } = require('../Helpers/multerStorage');
const mongoose = require('mongoose');
const loadProductList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;      
      
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
         

        const categoryId = req.query.categoryId;
        const totalProducts = await Product.countDocuments({ isListed:true,status:"Active"})

        const products = await Product.find({ isListed:true,status:"Active" })


        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .populate("category")

        res.render("productlist", {
             products: products,
              currentPage:page,
              totalPages : Math.ceil(totalProducts/limit),
              limit:limit,
              sortOption:sortOption
            })
    } catch (error) {
        console.error("Error loading product list:",error)
        res.status(500).send("Server Error",+error.message);
    }
};

const renderEditProductPage = async (req, res) => {
    try {
        const productId = req.query.id;
        if (!productId) {
            throw new Error("Product ID is missing from the request");
        }
        const product = await Product.findById(productId).populate("category");
        console.log(product);
        if (!product) {
            throw new Error("Product not found");
        }
        const categories = await categoryModel.find();
        res.render("editProduct", { product: product, categories: categories });
    } catch (error) {
        console.log(error.message); 
        res.status(500).send("Server Error: " + error.message);
    }
};

const editProduct = async (req, res) => {
    try {
        let { name, author, price, discount, description, category, stock, status, ratings, highlights, reviews, productId } = req.body;
        console.log("requset",req.body);
        let removeImages = req.body.removeImages || []
         console.log("removeImages",removeImages)
        if (!category || !mongoose.Types.ObjectId.isValid(category)) {
            throw new Error("Invalid category ID");
        }

        // Check if category exists
        const categoryExists = await categoryModel.findById(category);
        console.log("categoryExists",categoryExists);
        if (!categoryExists) {
            throw new Error("Category not found");
        }

        let updateData = {
            name: name,
            author: author,
            price: price,
            discount: discount,
            description: description,
            category:new mongoose.Types.ObjectId(category),
            stock: stock,
            status: status,
            ratings: ratings,
            highlights: highlights,
            reviews: reviews
        };

        console.log("updateData",updateData);
        const product = await Product.findById(productId);
        console.log("product",product);

        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.filename);
            updateData.images = [...product.images, ...newImages];
        } else {
            updateData.images = product.images;
        }

        if (removeImages.length > 0) {
            updateData.images = updateData.images.filter(image => !removeImages.includes(image));
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });
        res.redirect('/admin/productList');
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
};

const loadAddProducts = async (req, res) => {
    try {
        const categories = await categoryModel.find();
        res.render("addProduct", { categories: categories })
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error")
    }
}



const addProduct = async (req, res) => {
    try {
        const { name, author, price, discount, description, category, stock, status, ratings, highlights, reviews } = req.body;
        const uploadedImages = req.files.map(file => file.filename);
        console.log("request",req.body)

        if (!mongoose.Types.ObjectId.isValid(category)) {
            throw new Error("Invalid category ID");
        }

        
        const newProduct = new Product({
            name: name,
            author: author,
            price: price,
            discount: discount,
            description: description,
            category:  new mongoose.Types.ObjectId(category),
            stock: stock,
            status: status,
            ratings: ratings,
            highlights: highlights,
            reviews: reviews,
            images: uploadedImages
        });

        console.log("newProduct",newProduct);

        await newProduct.save();
        res.redirect("/admin/productlist");
    } catch (error) {
        res.status(500).send("Server Error");
        console.log(error);
    }
};

const listProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        await Product.findByIdAndUpdate(productId, { isListed: true });
        res.redirect("/admin/productList");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
};

const unlistProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        await Product.findByIdAndUpdate(productId, { isListed: false });
        res.redirect("/admin/productList");
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Server Error");
    }
};

const showUnlisted = async (req, res) => {
    try {
        const unlistedProducts = await Product.find({ isListed: false }).populate("category");
        res.render("showunlisted", { unlistedProducts: unlistedProducts })
    } catch (error) {
        console.log(error.message)
        res.status(500).send("Server Error")
    }
}



module.exports = {
    loadProductList,
    addProduct,
    loadAddProducts,
    editProduct,
    renderEditProductPage,
    listProduct,
    unlistProduct,
    showUnlisted
};
