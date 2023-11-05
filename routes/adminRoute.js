const express=require('express');
const adminRouter=express.Router();
const bcrypt=require('bcryptjs');
const adminControl = require('../controller/adminController');
const User=require("../models/userModel");
const Order=require("../models/orders");
const Product=require('../models/products')
const multer=require('multer');
const categoryModel = require("../models/category");
const { product } = require('../controller/userController');
const nodeMailer=require('nodemailer')
const { Parser } = require('json2csv')
const subcategoryModel = require("../models/subcategories");
const sharp=require('sharp')
const storage=multer.diskStorage({
  destination: 'public/upload/',
  filename: function (req, file, cb) {

    const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    cb(null,uniqueSuffix );
  }
});
const upload=multer({storage:storage})

//middlewares
// function sessionExist(req,res,next){
//     if(req.session.admin){
//        next();
//     }
// }

// function noSessionExist(req,res,next){
//     if(!req.session.admin){
//         next();
//     }
// }



//get start from here 

adminRouter.get("/",adminControl.adminLogin);

adminRouter.get('/admin_page',adminControl.adminPage);

adminRouter.get('/product',adminControl.product);

adminRouter.get('/dashboard',adminControl.dashBoard);

adminRouter.get('/profile',adminControl.profiler);

adminRouter.get('/tables',adminControl.tables);

adminRouter.get('/deleteUser/:id',adminControl.deleteUser)

// get end here

//post method start from here for creating

adminRouter.post('/',adminControl.adminSession);

// Display the edit user form
adminRouter.get('/editUser', adminControl.editUserForm);

// Handle the user edit form submission
adminRouter.post('/editUser/:id', adminControl.editUser);

adminRouter.post('/logout',adminControl.destroySession)

adminRouter.post('/unlist-subcategory/:subcategoryId', async (req, res) => {
  try {
    const subcategory = await subcategoryModel.findById(req.params.subcategoryId);

    if (!subcategory) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // Set the 'unlisted' flag to true
    subcategory.unlisted = true;

    // Save the updated subcategory
    await subcategory.save();

    res.json({ message: 'Subcategory has been unlisted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

adminRouter.post('/deleteUser', async (req, res) => {
  try {
    // Assuming you have a unique identifier for the user, e.g., their ID
    const userId = req.body.userId; // Adjust this based on your data structure
    
    if (!userId) {
      return res.status(400).send("User ID is required for deletion.");
    }

    // Find and delete the user by ID
    const user = await User.findOneAndDelete({ _id: userId });

    // Clear the user session if the deletion was successful
    if (user) {
      delete req.session.user;
      res.redirect('/admin/tables');
    } else {
      return res.status(404).send("User not found.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

//product meela oru get nd
adminRouter.post('/addProduct',upload.array('images',5),async (req,res)=>{
  try{
    console.log(req.body);
    const{
      title,
      color,
      gender,
      category,
      size,
      price,
      stock,
      description
    }=req.body;
    const images=req.files.map((file)=>file.filename);
    const newProduct=new Product({
        title,
        color,
        gender,
        category,
        size,
        price,
        stock,
        images,
        description
    });
    await newProduct.save();
    console.log("product is saved:" + newProduct)
    res.redirect('/admin/product')
    }catch(error){
      console.log("error product saving :" + error.message);
      res.status(500).send('an error occurred while save product')
    }
  })


adminRouter.post('/deleteProduct/:id', async (req, res) => {
    try {
      const productId = req.params.id;
      const productData = await Product.findById(productId);
      if (!productData) {
        return res.status(404).send('Product not found');
      }
      productData.deleted = !productData.deleted;
      await productData.save();
      res.redirect('/admin/product');
    } catch (error) {
      console.log(error);
      res.status(500).send('An error occurred while deleting the product');
    }
});

adminRouter.post('/editProduct/:id',upload.array('images',5),async (req,res)=>{

  console.log(req.body);
  const productId=req.params.id;
  //taking the existing product
  const existProduct=await Product.findById(productId)

  const updateProductData={
    title:req.body.title,
    price:req.body.price,
    color:req.body.color,
    stock:req.body.stock,
    size:req.body.size,
    gender:req.body.gender,
    description:req.body.description

  };
  if(req.files && req.files.length > 0){
    updateProductData.images=req.files.map((file)=>file.filename);
  }else{
    updateProductData.images=existProduct.images
  }
  try {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId },
      { $set: updateProductData },
      { new: true }
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.redirect("/admin/product");
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Error updating product" });
  }
})

adminRouter.post('/deleteImg/:id', async (req,res)=>{
  console.log("deleteImg");
  try{
    const imageId=req.body.imgId
    console.log(imageId);
    const ProId=req.params.id//product id
    const pro=await Product.findById(ProId);
    console.log(pro);
    if(!pro){
      return res.status(404).json({response:"product not found"});
    }
    //find the index of the image
    let indexToDelete=-1;
    for(let i=0;i<pro.images.length;i++){
      if(prd.images[i]==imageId){
        indexToDelete=i
        break
      }
    }
    console.log(indexToDelete)
    if(indexToDelete === -1){
      return res.status(404).json({response:"image not found"});
    }
    //remove the image from the array;
    pro.images.splice(indexToDelete, 1);
    //save the update product back to data base
    await pro.save()  
    res.status(200).json({response:"ok"});
  }catch(error){  
    console.log(error);
    res.status(500).json({response:"error"});
  }
});

adminRouter.post("/updateStatus/:id",async (req,res)=>{
  try {
    const userId = req.params.id;

    const userData = await User.findById(userId);

    if (userData) {
      userData.is_blocked = !userData.is_blocked;

      await userData.save();

      res.redirect("/admin/tables");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Error while blocking user");
  }
});




adminRouter.get("/orders",async (req,res)=>{
  try{
    const order=await Order.find();

    res.render('admin/orders',{order});
  }catch(error){
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch orders." });
    
  }

})



adminRouter.post("/orders/:orderId/change-status", async (req, res) => {
  const { orderId } = req.params;
  const { newStatus } = req.body; // Assuming you send the new status in the request body

  try {
    const order = await Order.findOneAndUpdate(
      { _id: orderId },
      { status: newStatus },
      { new: true }
    );

    if (!order) {
      return res.status(404).redirect('/admin/orders');
    }

    if (newStatus === "Cancelled" && order.payment === 'ONLINE') {
      const userId = order.customer;
      console.log(order.totalAmount);
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
    
    res.status(200).redirect('/admin/orders');
    } catch (error) {
      console.error("Error:", error);
      res.status(500).redirect('/admin/orders');
    }
    
});





adminRouter.get('/sales', async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  let salesReport;

  try {
    // Define the initial aggregation pipeline
    const pipeline = [
      { $unwind: "$products" },
      { $match: { "status": "Delivered" } },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "products_details"
        }
      },
      { $unwind: "$products_details" },
      {
        $project: {
          order_id: "$orderId", // Change to "orderId"
          products_details: "$products_details",
          qty: "$products.quantity",
          total_amount: "$products.price",
          order_date: "$orderDate",
          payment_method: "$payment",
        }
      },
      { $sort: { "order_id": -1 } }
    ];

    // Check if a date range is provided
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Add a $match stage to filter by date range
      pipeline.push({
        $match: {
          order_date: {
            $gte: fromDate,
            $lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });
    }

    // Execute the aggregation query
    salesReport = await Order.aggregate(pipeline);

    // Pass the date filter values to the template
    res.render("admin/salesReport", { salesReport, from, to });

  } catch (e) {
    console.log(e.message + "this is admin sales where some mistakes ");
  }
});










const Notification=require('../models/notifications')


adminRouter.get('/notifications', async (req, res) => {
  if(req.session.admin){
  try {
    const notifications = await Notification.find({});
    res.render('admin/notifications', { notifications });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
}else{
  res.redirect('/admin')
}
});

adminRouter.post('/notifications', async (req, res) => {
  const notifications = req.body.notifications;
  try {
    const newNotification = new Notification({
      notification: notifications,
      notificationDate: new Date()
      
    });
    const savedNotification = await newNotification.save();
    res.redirect('/admin/notifications'); // Corrected the redirect path
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

adminRouter.post('/notifications/:id', async (req, res) => {
  const notificationId = req.params.id;
  try {
    // Delete the notification by its ID
    await Notification.findByIdAndRemove(notificationId);

    res.redirect('/admin/notifications'); // Redirect back to the notifications page
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

const Coupons=require('../models/coupons');


adminRouter.get('/coupons',async (req,res)=>{
try{
  if(req.session.admin){
    const Coupon= await Coupons.find({})
    res.render('admin/coupons',{Coupon})
  }else{
    res.redirect('/admin');
  }
}catch(error){
  console.log(error)
}
})


adminRouter.post('/createCoupon',async (req, res) => {
  try {
    const coupon = {
      code: req.body.code,
      type: req.body.type,
      expireDate: req.body.expiry,
      discount: req.body.discount,
      min: req.body.min
    }



    const exist = await Coupons.findOne({ code: req.body.code })

    // Assuming you're using a database model named 'Coupon' and the appropriate method for creating a document

    if (exist) {
      res.send("already exist in the code")
      res.redirect('/admin/coupons')
    } else {
      const newCoupon = await Coupons.create(coupon);

      // Send a success response to the client
      res.redirect("/admin/coupons");
    }
  } catch (e) {
    console.error(e.message); // Log the error
    res.status(500).json({ error: 'An error occurred while creating the coupon.' });
  }
})


adminRouter.post('/updateCoupons/:id',async (req,res)=>{
  const { id }=req.params;
  try{
    const updateCoupon= await Coupons.findByIdAndUpdate(id,req.body,{new:true})
    res.json(updateCoupon);
  }catch(error){
    console.log(error)
  }
})

adminRouter.post('/unListCoupons/:id',async (req,res)=>{
  const couponId=req.params.id;
  const coupon=await Coupons.findById(couponId);
  if(!coupon){
    return res.status(404).send('coupon not found')
  }
  coupon.isDelete=! coupon.isDelete;
  await coupon.save();
  res.redirect('/admin/coupons')
})

adminRouter.post('/subcategory',async (req, res) => {
  const { gender, newsubcategory } = req.body;

  try {
    let category = await categoryModel.findOne({ gender: gender });

    if (!category) {
      category = new categoryModel({
        gender: gender,
        subcategories: [],
      });
    }
    console.log(req.body)
    const newSubcategoryName = newsubcategory.toUpperCase();

    const existingSubcategory = await subcategoryModel.findOne({
      name: newSubcategoryName,
    });

    if (existingSubcategory) {
      req.flash("error", "Subcategory already exists.");
      return res.status(400).redirect("/admin/products");
    }

    const subcategory = new subcategoryModel({
      name: newSubcategoryName,
    });

    await subcategory.save();

    category.subcategories.push(subcategory._id);
    await category.save();

    res.redirect("/admin/product");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error saving subcategory");
  }
})
module.exports=adminRouter;