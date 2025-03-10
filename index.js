const mongoose = require("mongoose");
require('dotenv').config()
mongoose.connect(process.env.MONGO_URL);


const cookieParser = require('cookie-parser');
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");

const nocache = require("nocache");
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(nocache())
app.use(express.static('public'))


app.use('/', userRoute)
app.use('/admin', adminRoute)


const PORT = process.env.PORT || 3000;
app.listen(PORT, function () {
    console.log(`Server is running on port ${PORT}`);
});


