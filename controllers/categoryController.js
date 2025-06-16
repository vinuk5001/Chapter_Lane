const Category = require("../models/categoryModel");


//----------------Loading Categories Page --------------------//

const loadCategory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    const totalCategories = await Category.countDocuments();
    const categories = await Category.find({}).skip(skip).limit(limit);
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("categories", {
      category: categories,
      currentPage: page,
      totalPages: totalPages,
      limit: limit,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.log(error.message);
    res.render("categories", {
      category: [],
      currentPAge: 1,
      toalPages: 1,
      limit: 5,
      totalCategories: 0,
      error: "Something went wrong. Please try again later.",
    });
  }
};

//----------------Loading Add Category Page --------------------//
const loadAddCategory = async (req, res) => {
  try {
    let { name, description, order } = req.body;
    name = name.trim();
    description = description.trim();
    const categories = await Category.find({ is_Listed: true });
    if (!name || !description) {
      return res.render("categories", {
        message: "Name and description are required",
        category: categories,
      });
    }
    const namePattern = /^[A-Za-z\s]+$/;
    const descriptionPattern = /^[A-Za-z\s]+$/;
    if (!namePattern.test(name)) {
      return res.render("categories", {
        message:
          "Category name should contain only letters and spaces, no numberes or symbols allowed",
        category: categories,
      });
    }

    if (!descriptionPattern.test(description)) {
      return res.render("categories", {
        message:
          "Category description should contain only letters and spaces, no numberes or symbols allowed",
        category: categories,
      });
    }

    const existingCategory = await Category.findOne({
      $or: [{ name: name }, { description: description }],
    });

    if (existingCategory) {
      return res.render("categories", {
        message: "Category with the same name or description already exists",
        category: categories,
      });
    }

    const newCategory = new Category({ name, description, order });
    await newCategory.save();

    res.redirect("/admin/categories");
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

//---------------------Render Edit Category ---------------------//

const renderEditCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    const category = await Category.findById(categoryId);
    res.render("editcategory", { category: category });
  } catch (error) {
    console.log(error.message);
    res.render("editcategory", {
      error: "Something went wrong. Please try again later.",
    });
  }
}


//----------------------Edit Category -------------------------//

const editCategory = async (req, res) => {
  try {
    console.log("entering into editCategory");
    const { categoryId, name, description } = req.body;
    console.log(categoryId)
    console.log(req.body);

    let categories = await Category.find({ is_Listed: true });
    const existingCategory = await Category.findOne({
      name: name,
      description: description
    });
    console.log(existingCategory);


    if (existingCategory) {
      console.log("exists");

      return res.render("categories", {
        category: categories,
        message: "Category with the same name or description already exists",
      });
    }

    const updateData = { name, description };
    const newd = await Category.findByIdAndUpdate({ _id: categoryId }, updateData, { new: true });
    console.log(newd)
    categories = await Category.find({ is_Listed: true });
    console.log(categories)

    res.render("categories", {
      category: categories,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("categories", {
      error: "Something went wrong. Please try again later.",
    });
  }
};

//----------------------List Category ---------------------------//

const listCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    await Category.findByIdAndUpdate(categoryId, { is_Listed: true });

    const categories = await Category.find({ is_Listed: true });
    res.render("categories", {
      category: categories,
      message: "Category listed successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("categories", { error: "Server Error" });
  }
}


//---------------------------unlist Category --------------------------//


const unlistCategory = async (req, res) => {
  try {
    const categoryId = req.query.id;
    await Category.findByIdAndUpdate(categoryId, { is_Listed: false });

    const categories = await Category.find({ is_Listed: true });
    res.render("categories", {
      category: categories,
      message: "Category unlisted successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("categories", { error: "Server Error" });
  }
};


//---------------------show Unlisted Categories---------------------------//

const showUnlistedCategory = async (req, res) => {
  try {
    const unlistedCategory = await Category.find({ is_Listed: false });
    res.render("showunlistedcategory", { Categories: unlistedCategory });
  } catch (error) {
    console.log(error.message);
    res.status(500).render("showunlistedcategory", { error: "Server Error" });
  }
};

module.exports = {
  loadCategory,
  loadAddCategory,
  renderEditCategory,
  editCategory,
  listCategory,
  unlistCategory,
  showUnlistedCategory,
};
