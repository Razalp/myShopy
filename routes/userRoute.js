const express=require('express');
const router=express.Router();
const bcrypt=require('bcryptjs');
const orders=require('../models/orders')
const UserOtp=require("../models/userOtp")
const userController=require("../controller/userController")
const User=require('../models/userModel');
const nodeMailer=require('nodemailer')
const Products=require('../models/products')
const mongoose=require('mongoose')
require('dotenv').config();
const multer = require('multer');
const Razorpay = require('razorpay');
const crypto=require('crypto')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/upload/'); // Define the upload directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({ storage: storage });
//get requests start from here=>

//login
router.get("/login",userController.getLogin); 
//single router
router.get("/user_registration",userController.userRegistration)

router.get("/forget_password",userController.forgetPassword)

  
//shop items
router.get("/",userController.homeGet)


router.get("/contact",userController.contact)



router.get("/product-detail",userController.product_details)

router.get("/product",userController.product)

router.get("/shoping-cart",userController.shopCart)

//<=get requests    end here

//post requests  here start=>

router.post('/login', async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    // const is_blocked=req.body.is_blocked
    // console.log(password);
    if(password.length<6){
      req.session.errMsgLogin="password atleast 6 digits"
      return res.redirect('/login')
    }
    try {
      const userData = await User.findOne({ email: email });
      if (userData) {
        let checkPassword = await bcrypt.compare(password, userData.password); // Correct argument order
       
   if (checkPassword) {
    if(userData.is_blocked){
      req.session.errMsgLogin='YOU ARE BLOCKED';
      return res.redirect('/login')
    }
            if(userData.isAdmin){
              req.session.errMsgLogin="THIS IS FOR USER LOGIN";
              return res.redirect('/login')
            }
  
          req.session.user=email;
          res.redirect('/');
        } else {
          req.session.errMsgLogin = 'Invalid password';
          res.redirect('/login');
        }
      } else {
        req.session.errMsgLogin = 'User not found'; // Handle case where user does not exist
        res.redirect('/login');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error'); // Handle other errors appropriately
    }
  });





router.post("/logout",async (req,res) => {
  req.session.destroy((err) => {
    console.log("destroy")
    if (err) {
      console.error('Error destroying session:', err);
      return res.sendStatus(500); 
    }
    res.redirect('/');
  });
});


//nodeMailer set up
const transport = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
  secure: true, // Use TLS
  tls: {
    rejectUnauthorized: false, // Disable TLS certificate verification
  },
});

//Generate OTP;
function GenerateOtp(){
  console.log("otp generated")
  return Math.floor(Math.random()*(9999-1000+1))+1000;
}
//function to send OTP email

const sendOtpEmail=async (toEmail,otp)=>{

  
  try{
    const email=toEmail;
    const mailOptions={
      form:"razalp0012300@gmail.com",
      to:email,
      subject:"OTP VERIFICATION",
      text:`verify your email to signup ... YOUR OTP IS : ${otp}`
    }
    transport.sendMail(mailOptions,(err)=>{
      if(err){
        console.log(err)
      }else{
        console.log("code sended")
      }
    }

    )
    console.log(`otp email send to your email`);
  }catch(error){
    console.log("error sending otp email");
    throw new error("email sending otp error :",error);
  }
}

//verify otp page
router.get('/login_otp',(req,res)=>{
  const email=req.session.email;
  const errorMessages=req.session.errorMessage
  res.render('user/login_otp',{email,title:"asfxgfxrs",massage:"OTP SENDED",errorMessages})
})
//conform otp;

router.post('/confirmOtp',async (req,res)=>{
  try{
    const {email,otp}=req.body;
    console.log(req.body)

    const otpRecord=await UserOtp.findOne({email});

    if(!otpRecord){
      req.session.errorMessage = 'OTP not found or has expired.';
      return res.redirect('/login_otp');
    }

    const now=new Date();
    if(now > otpRecord.expireAt){
      
      req.session.errorMessage = 'OTP has expired.';
      return res.redirect('/login_otp');
    }

    const isOtpValid=await bcrypt.compare(otp,otpRecord.otp);

    if(isOtpValid){
      // delete req.session.otp;// Marking user as verified in the User collection

      // const session=req.session.otp;
     let password=req.session.password;
      // 
      //destroying the specific session
      const hashPassword =bcrypt.hashSync(password);

      let user=new User({
        name:req.session.name,
        password:hashPassword,
        email:req.session.email,
        mobile:req.session.mobile
      });
      
      await user.save()

      req.session.user=email;

      // delete req.session.forOtp

      res.redirect('/')



    }else{
      req.session.errorMessage = 'Incorrect OTP entered.';
      res.redirect('/login_otp');
    }

  }catch(error){
    console.log(error)
    res.send('An error occurred while verifying')
  }
})

router.post('/user_registration', async (req, res) => {
  try {
    const { email, name, password, mobile } = req.body;
    
    if (password.length < 6) {
      req.session.errs = "Password must be at least 6 characters";
      return res.redirect('/user_registration');
    }

    const existingUser = await User.findOne({ email: email });

    if (existingUser) {
      req.session.errs = "Email already exists";
      return res.redirect("/user_registration");
    }

    // If the email does not exist, continue with the registration process
    const hashedPassword = bcrypt.hashSync(password, 5);
    req.session.email = email;
    req.session.password = password;
    req.session.name = name;
    req.session.mobile = mobile;

    // Generate OTP
    const otp = GenerateOtp().toString();

    // Send OTP via email
    await sendOtpEmail(email, otp);

    // Delete any existing OTP records for the same email
    await UserOtp.deleteMany({ email });

    // Hash the OTP
    const hashOtp = await bcrypt.hash(otp, 5);

    // Store OTP and expire time
    const expireAt = Date.now() + 5 * 60 * 1000;//expire with in 5 min
    await UserOtp.create({
      email: email,
      otp: hashOtp,
      createdAt: Date.now(),
      expireAt,
    });

    res.redirect("/login_otp");

  } catch (error) {
    console.log(error);
  }
});




router.post("/resendOtp", async (req, res) => {
  try {
    const { email } = req.body;
    const otp = GenerateOtp().toString();
    // Send OTP via mail
    await sendOtpEmail(email, otp);

    await UserOtp.deleteMany({ email });

    const hashOtp = await bcrypt.hash(otp, 5);

    const expireAt = Date.now() + 5 * 60 * 1000; // Corrected value
    await UserOtp.create({
      email: email,
      otp: hashOtp,
      createdAt: Date.now(),
      expireAt,
    });
    // Respond with a success message or status code
    res.status(200).send("OTP resent successfully");
  } catch (error) {
    console.error(error);
    // Handle and respond to the error appropriately
    res.status(500).send("Internal Server Error");
  }
});

router.get('/productView/:id', async (req,res)=>{
  try {
    let user = await User.findOne({ email: req.session.user });
   const productID = req.params.id;
   let product = await Products.findOne({ _id: productID }).populate({
    path: 'rating.customer',
    model: 'User' 
  });
  console.log("*********************")
  console.log(product.rating)
  console.log("*********************")

  //  let product = await Products.findOne({ _id: productID }).populate;

   res.render("user/productView",{user,product});
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
  
})

router.get('/userInfo',async (req,res)=>{
  try {
    const email=req.session.user

    if(req.session.user){

      const userId=req.params.id
      const users=await User.find({email:email})
      res.render("user/userInfo",{users})
    }else{
      req.session.erro="user cannot login"
      res.redirect('/')
      }
  } catch (error) {
  } 
  
  
})

router.post('/addAddress', async(req,res)=>{
  try{
    if(req.session.user){
      const email=req.session.user
      const user=await User.findOne({email:email})
      const {newname,house,post,city,state,district,contact}=req.body;
      console.log(req.body);

      // user.address=[]

      const newAddress={
        newname,
        house,
        post,
        city,
        state,
        district,
        contact
      }
      user.address.push(newAddress);
    
      // user.address.push(newAddress)
      
      await user.save();
      res.redirect('/userInfo')
    }
  }catch(error){
    console.log(error);
  }
})




router.post('/updateProfilePicture', upload.single('profileImage'), async (req, res) => {
  try {
      // Find the user based on their session or user ID
      const user = await User.findOne({ email: req.session.user });

      if (user) {
          user.profileImage = req.file.filename; // Store the uploaded file name in the profileImage field
          await user.save(); // Save the user document with the updated profile picture

          res.redirect('/userInfo'); // Redirect to the user profile page or wherever you display user information.
      } else {
          req.session.erro = "User not found"; // Handle this case appropriately
          res.redirect('/');
      }
  } catch (error) {
      // Handle errors appropriately
      console.error(error);
  }
});
router.post('/add-to-cart/:id', async (req, res) => {
  const { size, price } = req.body;
  const productId = req.params.id;
  const product = await Products.findOne({ _id: productId });
  const email = req.session.user;

  try {
    const user = await User.findOne({ email: email });

    if (user) {
      const existingCartItem = user.cart.find((item) => item.product.toString() === productId);

      if (existingCartItem) {
        // If the product already exists in the cart, update its quantity and total
        existingCartItem.quantity += 1;
        existingCartItem.total = existingCartItem.quantity * product.price;
      } else {
        // If the product doesn't exist in the cart, add it as a new item
        user.cart.push({
          product: productId,
          quantity: 1,
          size: size,
          color: product.color,
          price: product.price,
          total: product.price,
        });
      }

      await user.save();
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('An error occurred while adding the product to the cart');
  }
});


router.get("/cart",async (req,res)=>{
  if(req.session.user){
  const email=req.session.user;
  const user = await User.findOne({ email: email })
      .populate({
        path: "cart.product",
        model: "products",
      })
      .exec();
  // console.log(user)
  res.render('user/cart',{user});
    }else{
      res.redirect('/')
    }
})
router.post("/cart/remove", async (req, res) => {
  if (req.session.user) {
    const email = req.session.user;
    const { productId } = req.body; // Assuming you'll send the productId to be removed in the request body

    try {
      const user = await User.findOne({ email: email });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Find the index of the item to be removed in the cart
      const indexToRemove = user.cart.findIndex((item) => item.product.toString() === productId);

      if (indexToRemove === -1) {
        return res.status(404).json({ message: "Item not found in the cart" });
      }

      // Remove the item from the cart array
      user.cart.splice(indexToRemove, 1);
      
      // Save the user with the updated cart
      await user.save();

      return res.redirect('/cart')
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
});

// router.post('/editAddress', async (req, res) => {
//   try {
//     if (req.session.user) {
//       const email = req.session.user;
//       const user = await User.findOne({ email: email });

//       if (!user) {
//         req.session.errors = ["User not found"];
//         return res.status(404).redirect('/error-page'); // Redirect to an error page
//       }

//       // Retrieve edited address details from the request body
//       const { newname, house, post, city, state, district, contact } = req.body;

//       // Update the first address in the user's address array (you can modify this as needed)
//       user.address[0].newname = newname;
//       user.address[0].house = house;
//       user.address[0].post = post;
//       user.address[0].city = city;
//       user.address[0].state = state;
//       user.address[0].district = district;
//       user.address[0].contact = contact;

//       await user.save();

//       return res.redirect('/userInfo'); // Redirect to the user info page
//     }
//   } catch (error) {
//     console.error(error);
//     req.session.errors = ["Internal server error"];
//     return res.status(500).redirect('/userInfo'); // Redirect to an error page
//   }
// });
// Update user profile information


router.patch("/update-quantity",async (req,res)=>{
  const { productId, action } = req.body;

  
  try {
    const user = await User.findOne({email: req.session.user });

    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const id= new mongoose.Types.ObjectId(productId)
    const product =await Products.findById(id)

    // console.log(product)
    const stock= product.stock

    const cartItem = user.cart.find(item => item.product.toString() === productId);

  

    if (!cartItem) {
      return res.status(404).json({ error: 'Product not found in cart' });
    }

    if (action === 'increase' && cartItem.quantity < stock) {
      cartItem.quantity++;
     
    } else if (action === 'decrease' && cartItem.quantity > 1) {
      cartItem.quantity--;
    }


    // Assuming price is a property of cartItem and represents the price of one item
    cartItem.total = parseInt(cartItem.price * cartItem.quantity)

  
    await user.save(cartItem.total);


    const quantity = cartItem.quantity;
    const total = parseInt(cartItem.total)

    // Send updated cart item as JSON response
    res.status(200).json({ success: true, quantity, total });
  } catch (error) {
    console.error('Error updating quantity:', error);
    res.status(500).json({ error: 'Error updating quantity' });
  }
});


router.post('/updateAddress', async (req, res) => {
  try {
    if (req.session.user) {
      const email = req.session.user;
      const user = await User.findOne({ email: email });

      if (user && user.address.length > 0) {
        // Get the updated address data from the form
        const { newname, house, post, city, state, district, contact } = req.body;

        // Update the user's address
        user.address[0].newname = newname;
        user.address[0].house = house;
        user.address[0].post = post;
        user.address[0].city = city;
        user.address[0].state = state;
        user.address[0].district = district;
        user.address[0].contact = contact;

        await user.save();
        res.redirect('/userInfo');
      } else {
        res.status(404).send('User or address not found.');
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});

router.post('/removeAddress', async (req, res) => {
  try {
    if (req.session.user) {
      const email = req.session.user;
      const user = await User.findOne({ email: email });

      if (user && user.address.length > 0) {
        // Remove the first (or specific) address from the user's address array
        user.address.splice(0, 1); // Removes the first address

        await user.save();
        res.redirect('/userInfo');
      } else {
        res.status(404).send('User or address not found.');
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Internal Server Error');
  }
});








router.get('/orderHistory', async (req, res) => {
  try {

    if (req.session.user) {
      const email = req.session.user;
      
  
      const user = await User.findOne({ email: email });
  
      const userId = user._id;
  
      let orderData = await orders.find({ customer: userId });
      

      orderData = await orders.aggregate([
        {
          $match: { customer: userId },
        },
        {
          $sort: { orderDate: -1 },
        },
        {
          $lookup: {
            from: "products",
            localField: "products.product",
            foreignField: "_id",
            as: "productDetails",
          },  
        },
      ]);
  
      // console.log(user, '<===== user inside the user!!!!!!!!!');
    res.render('user/orderHistory', { user,orderData });

  }
} catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch order history.' });
  }
});


const Coupon=require('../models/coupons')

router.get("/checkOut", async (req, res) => {
  if (req.session.user) {
    const email = req.session.user;
    const user = await User.findOne({ email: email })
      .populate({
        path: "cart.product",
        model: "products",
      })
      .exec();
      
    const coupons = await Coupon.find(); // Use `find()` to get all coupons

    res.render('user/checkOut', { user, coupons });
  } else {
    res.redirect('/');
  }
});


const razorpay = new Razorpay({
  key_id:process.env.KEY_ID,
  key_secret:process.env.KEY_SECRET
})


router.post('/checkOut', async (req, res) => {
  console.log(req.body);
  try {
    const {
      userAddress,
      payment,
      quantity,
      totalAmount,
      product,
      color,
      size,
      price,
    } = req.body;

    const discountAmount = req.body.discountInput;
    const total = totalAmount - discountAmount;
    console.log(total);

    console.log(
      req.body,
      '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'
    );

    const email = req.session.user;
    const user = await User.findOne({ email: email });
    const userData = user._id;

    const address = await user.address.find(
      (item) => item._id.toString() == userAddress
    );

    console.log(address, '<=====ADDRESS');

    const addresses = {
      name: address.newname,
      house: address.house,
      city: address.city,
      state: address.state,
      district: address.district,
      post: address.post,
      contact: address.contact,
    };

    const productId = req.body.product;
    console.log(req.body);
    const productdata = await Products.findById(product);
    console.log(productdata);
    let products = [];

    if (payment === 'COD') {
      if (Array.isArray(product)) {
        product.forEach((prd, index) => {
          products.push({
            product: new mongoose.Types.ObjectId(prd),
            quantity: parseInt(quantity[index]),
            price: parseInt(price[index]),
          });
        });
      } else {
        products.push({
          product: new mongoose.Types.ObjectId(product),
          quantity: parseInt(quantity),
          price: parseInt(price),
        });
      }

      function generateRandomOrderId(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters.charAt(randomIndex);
        }
        return result;
      }

      // Generate a random order ID with a specific length (e.g., 8 characters)
      const randomOrderId = generateRandomOrderId(8);

      const order = new orders({
        orderId: randomOrderId,
        products,
        customer: userData,
        totalAmount: totalAmount - discountAmount,
        status: 'pending',
        payment: payment,
        address: addresses,
        orderDate: new Date(),
      });

      await order.save();

      await User.findByIdAndUpdate(userData, {
        $pull: {
          cart: { product: { $in: products.map((item) => item.product) },
        },
      }});

      if (productdata && productdata.stock >= quantity) {
        productdata.stock -= quantity;
        await productdata.save();
      }

      res.json({ codSuccess: true });
    } else if (payment === 'ONLINE') {
      console.log(req.body);
      // for online payment
      const email = req.session.user;
      const user = await User.findOne({ email: email });
      const discountInput = req.body.discountInput;
      console.log(user + "----------------------");
      req.session.OrderList = req.body;
      let amount = totalAmount - discountInput;
      req.session.orderAmount = amount;

      const randomOrderId = Math.floor(Math.random() * 10000).toString();
      const options = {
        amount: amount * 100,
        currency: 'INR',
        receipt: randomOrderId,
      };

      razorpay.orders.create(options, (err) => {
        if (!err) {
          res.status(200).send({
            razorSuccess: true,
            msg: 'order created',
            amount: amount * 100,
            key_id: 'rzp_test_utuGLuR9VR7dJf',
            name: user.name,
            contact: addresses.contact,
            email: email,
          });
        } else {
          console.log('error occurred');
          console.error('Razorpay Error:', err);
          res.status(400).send({ razorSuccess: false, msg: 'Error creating order with Razorpay' });
        }
      });
    } // Existing code...

    else if (payment === 'wallet') {
      const email = req.session.user;
      const user = await User.findOne({ email: email });
      const discountAmount = req.body.discountInput;
    
      // Generate a unique random order ID for each wallet payment
      function generateRandomOrderIds(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters.charAt(randomIndex);
        }
        return result;
      }
      const randomOrderIds = generateRandomOrderIds(8); // Use the same function as in the COD section
    
      const amountToPay = totalAmount - discountAmount;
    
      if (user.wallet) {
        if (user.wallet.balance >= amountToPay) {
          // Sufficient balance in the wallet, deduct the payment amount
          user.wallet.balance -= amountToPay;
    
          // Create a new order
         
          const order = new orders({
            orderId: randomOrderIds, // Use the generated order ID
            products,
            customer: userData,
            totalAmount: totalAmount - discountAmount,
            status: 'pending',
            payment: payment,
            address: addresses,
            orderDate: new Date(),
          });
    
          await order.save();
        
          await User.findByIdAndUpdate(userData, {
            $pull: {
              cart: { product: { $in: products.map((item) => item.product) },
            },
          }});
    
          if (productdata && productdata.stock >= quantity) {
            productdata.stock -= quantity;
            await productdata.save();
          }
          console.log(user.wallet.balance)
          const transactionDescription = `Debited ${amountToPay} into your orderHistory`
    
          user.wallet.transactions.push({
            transactionDescription: transactionDescription,
            date: new Date()
          });
    
          await user.save(); // Save the updated wallet balance
    
          res.json({ codSuccess: true });
        } else {
          console.log('Insufficient balance in the wallet');
          res.status(400).json({ walletSuccess: false, message: 'Insufficient balance in the wallet' });
        }
      } else {
        console.log('Wallet not defined');
        res.status(400).json({ walletSuccess: false, message: 'Wallet not defined' });
      }
    }
    
    // Existing code...
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, message: 'Order failed. Please try again.' });
  }
});




router.post('/verify-payment' ,async (req, res) => {
  try {


    const {
      userAddress,
      payment,
      quantity,
      totalAmount,
      product,
      color,
      size,
      price
    } = req.body;

    console.log(req.body,"<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    // console.log(req.body,'<=====inside the body');

    const email = req.session.user;
    const user = await User.findOne({ email: email });
    const userData = user._id;
    
    const address = await user.address.find(
      (item) => item._id.toString() == userAddress
    );

  

    console.log(address,'<=====ADDRESS');

    const addresses = {
      name:address.newname,
      house:address.house,
      city: address.city,
      state: address.state,
      district: address.district,
      post: address.post,
      contact:address.contact,

    };

    const productId = req.body.product;
    console.log(req.body);
    const productdata = await Products.findById(product);
    console.log(productdata);
    let products = [];
    
    

    
    if (Array.isArray(product)) {

      product.forEach((prd, index) => {

        products.push({
          product: new mongoose.Types.ObjectId(prd),
          quantity: parseInt(quantity[index]),
          price: parseInt(price[index]),
        });

      });

    } else {
      
      products.push({
        product: new mongoose.Types.ObjectId(product),
        quantity: parseInt(quantity),
        price: parseInt(price),
      });

    }

    function generateRandomOrderId(length) {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
      }
      return result;
    }
    
    // Generate a random order ID with a specific length (e.g., 8 characters)
    const randomOrderId = generateRandomOrderId(8);
    
    const order = new orders({
      orderId: randomOrderId,
      products,
      customer: userData,
      totalAmount,
      status: "pending",
      payment: payment,
      address: addresses,
      orderDate: new Date(),
    });
    

    await order.save();

    await User.findByIdAndUpdate(userData, {
      $pull: {
        cart: { product: { $in: products.map((item) => item.product) } },
      },
    });

    if (productdata && productdata.stock >= quantity) {
      productdata.stock -= quantity;
      await productdata.save();
    }


    res.status(200).json({ success: true })

  } catch (e) {
    console.error(e.message)
  }
})


router.post("/ordersHistory/:orderId/change-status", async (req, res) => {
  const { orderId } = req.params;
  const { newStatus } = req.body; // Assuming you send the new status in the request body
  try {
    const order = await orders.findOneAndUpdate(
      { _id: orderId },
      { status: newStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).redirect('/orderHistory')
    }
    if (newStatus === "Cancelled" && order.payment === 'ONLINE') {
      const userId = order.customer;
      console.log(order.totalAmount)
      const user = await User.findById(userId);
    
      // Create a new wallet field if it doesn't exist
      if (!user.wallet) {
        user.wallet = {
          balance: 0,
          transactions: [],
        };
      }
    
      console.log(user.wallet.balance)
    
      user.wallet.balance += parseInt(order.totalAmount);
      console.log(user);
    
      const totalAmount = order.totalAmount;
    
      console.log(user);
    
      // Create a transaction object
      const transaction = {
        //    // You should have orderId defined somewhere in your code
        transactionDescription: `Credited ${totalAmount} into your orderHistory`,
        date: new Date()
      };
    
      // Push the transaction into the transactions array
      user.wallet.transactions.push(transaction);
      console.log(user.wallet);
    
      // Save the updated user object to the database
      await user.save();
    }
    res.status(200).redirect('/orderHistory')
  } catch (error) {
    console.error("Error:", error);
    res.status(500).redirect('/orderHistory')
  }
});

router.get('/reset-password',async (req, res) => {
  const token = req.query.token;
  try {
    // Find user by token and check token expiration
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });



    if (!user) {
      return res.status(400).send('Invalid or expired token');

    }

    // Render password reset page
    res.send(`
  <html>
  <body>
    <div style="display:flex; justify-content:center; align-items:center; width:100%;height:100vh; ">
      <form action="/newPassword" method="POST" style="border:1px solid gray; padding:2rem; background-color:grey; border-radius:8px">
        <input type="hidden" name="token" value="${token}">
        <label>New Password: <input type="password" name="newPassword" id="newPassword" required></label>
        <label>Confirm Password: <input type="password" name="confirmPassword" id="confirmPassword" required></label>
        <span id="passwordMismatch" style="color: red; display: none;">Passwords do not match.</span>
        <button style="background-color: dark; border-radius: 5px" type="submit" id="submitButton">Reset Password</button>
      </form>
    </div>

    <script>
      // JavaScript to check if passwords match
      const newPasswordInput = document.getElementById('newPassword');
      const confirmPasswordInput = document.getElementById('confirmPassword');
      const passwordMismatch = document.getElementById('passwordMismatch');
      const submitButton = document.getElementById('submitButton');

      function checkPasswordMatch() {
        if (newPasswordInput.value !== confirmPasswordInput.value) {
          passwordMismatch.style.display = 'block';
          submitButton.disabled = true;
        } else {
          passwordMismatch.style.display = 'none';
          submitButton.disabled = false;
        }
      }

      newPasswordInput.addEventListener('input', checkPasswordMatch);
      confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    </script>
  </body>
  </html>
`);

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');

  }
})

router.post('/rest-password',async (req, res) => {
  const userEmail = req.body.email;

 

  try {
    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).send('User not found');
    }

   
    // Generate a unique token
    const token = crypto.randomBytes(8).toString('hex');

    const resetPasswordToken = token;
    const resetPasswordExpires = Date.now() + 24 * 60 * 60 * 1000;
    const result = await User.updateOne(
      { email: userEmail },
      {
        $set: {
          resetPasswordToken,
          resetPasswordExpires
        }
      },
      { upsert: true } // Create user if not exists

      );
      console.log(result)





    // Send password reset email
    const mailOptions = {
      from: "razalp0012300@gmail.com",
      to: userEmail,
      subject: 'Password Reset Request',
      text: `Click the following link to reset your password: http://localhost:3008/reset-password?token=${token}`
    };

    transport.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
        res.status(500).send('Error sending email');
      } else {
        console.log('Email sent: ' + info.response);
        res.status(200).send(`
        <html>
        <body>
          <div style="display:flex; justify-content:center; align-items:center; width:100%;height:100vh; ">
          <div style="border:1px solid gray; padding:1rem;border-radius:8px; display:flex; justify-content:center;">
         <h3>Email successfully sent to ${userEmail} <br> please check your Email</h3>
          </div>
          </div>
        </body>
        </html>
      `);
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
})

router.post('/newPassword',async (req,res)=>{
  const token=req.body.token;
  const newPassword=req.body.newPassword
  try{
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if(!user){
      return res.status(400).send('invalid or expire tokens');
    }

    //update password
    const hashPassword=await bcrypt.hash(newPassword,5)
    user.password=hashPassword;
    user.resetPasswordExpires=undefined;
    user.resetPasswordToken=undefined;
    await user.save();
    res.redirect('/login');
  }catch(error){
    console.log(error)
    res.redirect('/login')//
  }
})

router.post('/rating', async (req, res) => {
  const productId = req.body.idProduct;
  const email = req.session.user
  // const product = await Products.findById(productId);
  let product = await Products.findOne({ _id: productId }).populate({
    path: 'rating.customer',
    model: 'User' // Assuming 'User' is the model name for users
  });
  
console.log(req.body)
  try {
    const user = await User.findOne({ email: email });
    console.log(user)
    const userId=user._id
  
    const newRating = req.body.rating;
    const newReview = req.body.review;

    const existingRating = product.rating.find(
      (rating) => rating.customer.equals(userId)
    );

    if (existingRating) {

      existingRating.rate = newRating;
      existingRating.review = newReview;
    } else {

      product.rating.push({
        customer:userId,
        rate: newRating,
        review: newReview,
      });
    }
    await product.save();

    res.redirect('/orderHistory');
  } catch (error) {
    console.log(error);
  }
});



router.post('/applyCoupon',async (req, res) => {
  const { couponCode, total, prevtotal } = req.body;



  try {
    // Check if the coupon code exists in the database
    const email=req.session.user
    const user = await User.findOne({email:email })
    const coupon = await Coupon.findOne({ code: couponCode });


    if (coupon) {
      // Check if the coupon has expired
      const currentDate = new Date();
      if (currentDate > coupon.expireDate) {
        res.json({ success: false, message: 'Coupon has expired' });
        return;
      }


      // const minAmount = parseInt(coupon.min)


      if (coupon.min <= total) {


        if (user.usedCoupons.includes(coupon._id)) {
          res.json({ success: false, message: 'Coupon already used by this user' });
          return;
        }


        let discount = coupon.discount;
        let discountedPrice;

        if (coupon.type === "OFF") {
          const discounted = total * (discount / 100);
          discountedPrice = Math.floor(total - discounted);
          discount = coupon.discount + "%"
        } else if (coupon.type === "FLAT") {
          discountedPrice = total - discount;
        }

        // Respond with the discounted price
        res.json({ success: true, discountedPrice, message: 'Coupon added', discount });

      }
      else {
        res.json({ success: false, message: 'Coupon limit exceeded' });
      }

      // Calculate the discount based on the coupon type

    } else {
      // Coupon code is not found in the database
      res.json({ success: false, message: 'Invalid coupon code' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}
  )






module.exports=router;