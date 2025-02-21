const passport=require("passport")
const userModel = require("../models/userModel")
 const jwt=require("jsonwebtoken")
 require("dotenv").config()
 const createToken = (user)=>{
    const JWT_SECRET = process.env.JWT_SECRET
    return jwt.sign(user,JWT_SECRET,{expiresIn:"1h"})
  
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userModel.findById(id);
		console.log(user,"user")
        done(null, user);
    } catch (error) {
		console.log(error,"err");
		
        done(error, null);
    }
});

const GoogleStrategy = require('passport-google-oauth2').Strategy;
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },

  
  async (request, accessToken, refreshToken, profile, done) => {
    try {
		let user = await userModel.findOne({
			email: profile.emails[0].value,
		});
		console.log(user);
		

		if (user) {
			console.log("hereeeeee",user);
			
			if (user.is_blocked) {
				return done(null, false, {
					message: "User is blocked",
				});
			}
			// If user is not blocked them log them to home
			return done(null, user);
		} else {
			// User does not exist, create a new user
			user = new userModel({
				email: profile.emails[0].value,
				username: profile.displayName,
				is_verified: true,
				password: "",
				googleId: profile.id,
				mobile_number: null

			});


			await user.save();
			console.log("userggggggggggg",user);

			return done(null, user);

		}
		
	} catch (err) {
		console.error("Error during Google authentication:", err);
		return done(err, null);
	}
  }

));


