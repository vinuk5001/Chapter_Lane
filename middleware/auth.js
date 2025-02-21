const jwt = require("jsonwebtoken");
require("dotenv").config();
const secret = process.env.JWT_SECRET;
require("dotenv").config()
const { insertUser } = require('../controllers/userController');
const User = require('../models/userModel');


const isAuthenticated = async(req,res,next) =>{
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if(!token){
        return res.status(401).send({error:"Authentication token is missing"})
    }
    try {
    
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ _id: decoded._id, 'tokens.token': token });

        if (!user) {
            throw new Error('User not found or token invalid');
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error){
        if(error.name === 'TokenEXpiredError'){
            return res.status(401).send({error:'Token expired.Please log in again'})
        }
        res.status(401).send({ error: 'Please authenticate.' });
    } 
}


const requireAuth = (req, res, next) => {
    try {
          const token = req.cookies.admin
        if (!token) {
             return res.status(401).redirect("/admin");
        }
            jwt.verify(token, secret, (err, decodeToken) => {
                if (err) {
                    console.error("JWT verification failed",err);
                    res.status(401).redirect("/admin");
                } 
                    req.admin = decodeToken;
                    next();
            });
        } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
    }



const requirelogin = (req,res,next) => {
    try {
        const tokens = req.cookies.admin;
        const token = req.cookies.jwt;
        if(token){
            jwt.verify(token, secret, async(err, decodeToken) => {
                if (err) {
                    console.error("JWT verification failed:",err);
                    if(err.name === "TokenExpiredError"){
                   return res.redirect("/login");
                } 
                return res.redirect("/login");
            }
                    req.user= decodeToken;
                    const user = await User.findById(req.user.id);
                   if(user && user.is_blocked){
                     res.clearCookie("jwt");
                     return res.redirect("/login");
                   }
                    next();
            })
        } else {
            res.redirect("/login")
        }
    }catch(error){
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
}




const isLoggedin=async(req,res,next)=>{
    try {
        const token=req.cookies.jwt
     
        if(token){
            jwt.verify(token,secret,(err,decodeToken)=>{
                if(err){
                    console.log(err);
                    return res.redirect("/")
                }
                
                    req.id=decodeToken;
                    if(!res.headersSent){
                    return res.redirect("/home")
                    }
            })
        }
        else{
           next()
        }
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    requirelogin,
    requireAuth,
    isLoggedin,
    isAuthenticated
};
