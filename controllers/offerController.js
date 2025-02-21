const Category = require("../models/categoryModel");
const CategoryOffer = require("../models/OfferModel");

const categoryOffer = async (req, res) => {
    try {
    
        const categories = await Category.find({});
        const categoryOffers = await CategoryOffer.find({}).populate("category");
        
        res.render("admin/categoryOffers", { categories, categoryOffers });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = { 
    categoryOffer 
};
