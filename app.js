if (process.env.NODE_ENV !== "production" ) {
    require('dotenv').config();
}
const express = require("express");
const app = express();
const path = require("path");
const port = 2103;
const mongoose = require("mongoose");
const Cart = require("./models/cart.js");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const {cartSchema, reviewSchema} = require("./schema.js");
const wrapAsync = require("./utils/wrapAsync.js");
const Review = require("./models/review.js");
const session = require("express-session");
const flash= require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require('passport-local-mongoose');
const User = require("./models/user.js");
const moment= require("moment");
const MongoStore = require('connect-mongo');
const {saveRedirectUrl} = require("./middleware.js");


const cartRouter=require("./routes/cart.js");
const reviewRouter=require("./routes/review.js");
const userRouter=require("./routes/user.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/ecommerce"

const dbUrl= process.env.ATLAS_URL;
const secret = process.env.SECRET || 'thisshouldbeabettersecret';

main()
    .then(()=>{
        console.log("connection succesful");
    })
    .catch(err => {
        console.log(err)
    });

    async function main() {
        await mongoose.connect(dbUrl, {
            tlsAllowInvalidCertificates: true, // If you are using self-signed certificates
            serverSelectionTimeoutMS: 30000, // Increase server selection timeout
            socketTimeoutMS: 45000,
        });
    }


app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended : true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(methodOverride("_method"));
app.engine("ejs",ejsMate);
app.use("/frontend",express.static("frontend.js"));



app.get("/",(req,res)=>{
    res.redirect("/carts");
});

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: "process.env.SECRET"
    },
    touchAfter: 24 * 3600,
});

store.on("error", ()=>{
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions=({
    store,
    secret,
    resave: false,
    saveUninitialized : true,
    cookie: {
        expires: Date.now()+ 7*24*60*60*1000,
        maxAge : 7*24*60*60*1000,
        httpOnly: true,
    }
});

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// app.get("/testcart",async(req,res)=>{
//     let samplecart = new Cart({
//         title:"redjacket",
//         description:"this is good jacket",
//         price:800,
//         size:"XL",
//         category:"Female", 
//     });
//     await samplecart.save();
//     console.log("sample was saved");
//     res.send("successful");
// });

app.use((req,res,next)=>{
    res.locals.currUser=req.user;
    res.locals.success= req.flash("success");
    res.locals.error= req.flash("error");
    next();
});

app.locals.formatDate = function(date) {
    return moment(date).format('MMMM Do YYYY');
};

app.use("/carts",cartRouter);
app.use("/carts/:id/reviews",reviewRouter);
app.use("/",userRouter);

app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not found!"));
});
app.use((err,req,res,next)=>{
    let { statusCode = 500, message="Something went wrong!"} = err;
    res.status(statusCode).render("error.ejs",{message});
});

try {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
} catch (error) {
    console.error("An error occurred while starting the server:", error);
}


