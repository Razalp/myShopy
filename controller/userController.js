const session = require('express-session');
const User=require('../models/userModel');
const userOtp=require('../models/userOtp');
const nodemailer = require("nodemailer");
const Product=require("../models/products");
require('dotenv').config();
//get requests         start from here

const getLogin=async (req,res)=>{
    
    if(req.session.user){
    res.redirect('/')
    }else{
        const errMsgLogin=req.session.errMsgLogin
        res.render("user/user_login",{title:"Login page",errMsgLogin})
    }
}

const userRegistration=async (req,res)=>{ 
    if(req.session.user){
        res.redirect("/");
    }else{
        const errs=req.session.errs
        res.render('user/user_registrarion',{title:"user registration",errs});
    }
}

const forgetPassword=async (req,res)=>{
    res.render('user/forget_password',{title:"forget password"})
}



const home=async (req,res)=>{
    try{
        const userId=req.session.user
        
        const user=await User.findOne({id:userId})
        
        // console.log(user)
       const product=await Product.find({deleted:false})

            res.render("user/index",{user:user||false,product})
    }catch(error){

    }
    
}






const contact=async (req,res)=>{
    res.render('user/contact',{title:"page"})
}




const product_details= async (req,res)=>{

    res.render('user/product-detail',{title:"page"})
}

const product=async (req,res)=>{
    try{
        const email=req.session.user
        const user= await User.findOne({email:email});

        const product=await Product.find({})
        res.render('user/product',{title:"page",product,user})
    }catch(error){
        console.log(error)
    }
    
}

const shopCart=async (req,res)=>{

    res.render('user/shoping-cart',{title:"page"})
}



const Notification=require('../models/notifications')
const homeGet = async (req, res) => {
    try {

      const user = await User.findOne({ email: req.session.user })
  
      const product = await Product.find({ deleted: false })
      const notification=await Notification.find({})
  

        
      if (user) {
        console.log(user._id)
        return res.render("user/index", { user, product,notification});
        
      } else {
  
        return res.render("user/index", {
          product,
          user: false,
          notification,
        });
      }
    } catch (e) {
      console.log(e.message);
    }
  };
// get requests end here 



module.exports={getLogin,
    userRegistration,
    forgetPassword,
    home,
    contact,
    product_details,
    product,
    shopCart,homeGet
}