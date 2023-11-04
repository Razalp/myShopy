const session = require('express-session');
const DbAdmin=require('../models/adminModel');
const User=require("../models/userModel");
const products=require('../models/products')
const categoryModel=require('../models/category')
const multer=require('multer')
const Orders=require('../models/orders')

const adminLogin=async (req,res)=>{
    if(req.session.admin){
        res.redirect('/admin/dashboard')
    }else{
        const errmsg=req.session.err
    res.render('admin/admin_login',{title:"Admin Login",errmsg})
}
}

const adminPage=async(req,res)=>{
    res.render('admin/admin_page')
}

const product = async (req, res) => {
  try {
      if (req.session.admin) {
          const page = parseInt(req.query.page) || 1;
          const perPage = 3; // Display 3 products per page
          const skip = (page - 1) * perPage;

          // Get the selected price range from the request
          const priceRange = req.query.price_range;

          let priceQuery = {}; // Initialize an empty query for price filtering

          // Define price range filters based on the selected option
          if (priceRange === "0-999") {
              priceQuery = { price: { $gte: 0, $lte: 999 } };
          } else if (priceRange === "1000-1999") {
              priceQuery = { price: { $gte: 1000, $lte: 1999 } };
          } else if (priceRange === "2000-2999") {
              priceQuery = { price: { $gte: 2000, $lte: 2999 } };
          } else if (priceRange === "3000-3999") {
              priceQuery = { price: { $gte: 3000, $lte: 3999 } };
          }

          const productData = await products
              .find(priceQuery) // Apply the price range filter
              .sort({ _id: -1 })
              .skip(skip)
              .limit(perPage);

          const totalPages = Math.ceil(await products.countDocuments(priceQuery) / perPage);

          const maleCategory = await categoryModel
              .findOne({ gender: "Male" })
              .populate("subcategories");
          const femaleCategory = await categoryModel
              .findOne({ gender: "Female" })
              .populate("subcategories");

          res.render('admin/product', {
              products: productData,
              maleCategory,
              femaleCategory,
              page,
              totalPages,
              selectedPriceRange: priceRange, // Pass the selected price range to the view
          });
      } else {
          res.redirect("/admin");
      }
  } catch (error) {
      console.log(error.message);
      res.status(500).send('server error');
  }
};

    


const dashBoard=async (req, res) => {
    try {
      if (req.session.admin) {


        const weekSales = await Orders.aggregate([
          {
            $match: {
              status: "Delivered"
            }
          },
          {
            $unwind: "$products"
          },
          {
            $project: {
              year: { $year: "$orderDate" },
              week: { $week: "$orderDate" }, // Extract week number
              weeklySales: {
                $multiply: ["$products.price", "$products.quantity"]
              }
            }
          },
          {
            $group: {
              _id: {
                year: "$year",
                week: "$week"
              },
              weeklySales: { $sum: "$weeklySales" }
            }
          },
          {
            $project: {
              _id: 0,
              year: "$_id.year",
              week: "$_id.week",
              weeklySales: 1
            }
          },
          {
            $sort: {
              year: 1,
              week: 1
            }
          }
        ]);
        console.log(weekSales )
        const monthSales = await Orders.aggregate([
          {
            $match: {
              status: "Delivered"
            }
          },
          {
            $unwind: "$products"
          },
          {
            $project: {
              year: { $year: "$orderDate" },
              month: { $month: "$orderDate" },
              monthlySales: {
                $multiply: ["$products.price", "$products.quantity"]
              }
            }
          },
          {
            $group: {
              _id: {
                year: "$year",
                month: "$month"
              },
              monthlySales: { $sum: "$monthlySales" }
            }
          },
          {
            $project: {
              _id: 0,
              year: "$_id.year",
              month: "$_id.month",
              monthlySales: 1
            }
          },
          {
            $sort: {
              year: 1,
              month: 1
            }
          }
        ]);
        console.log(monthSales);
        const totalSalesAmount = monthSales.reduce((total, sale) => total + sale.monthlySales, 0);
  
        const orderCount = await Orders.countDocuments({ status: "Delivered" });
        const productCount = await products.countDocuments({ deleted: "false" });
  
        const allUsers = await User.find({});
  
        const blockedUserCount = allUsers.filter(user => user.is_blocked).length;
        const nonBlockedUserCount = allUsers.filter(user => !user.is_blocked).length;
  
        res.render("admin/dashboard", {
          weekSales,
          monthSales,
          totalSalesAmount,
          orderCount,
          productCount,
          blockedUserCount,
          allUsers,
          nonBlockedUserCount // Pass these counts to the template
        });
      } else {
        res.redirect("/admin");
      }
    } catch (e) {
      console.log(e.message);
    }
  };
        

  

const profiler=async (req,res)=>{
    res.render('admin/profile')
}

const tables=async (req,res)=>{
    if(req.session.admin){
    const user=await User.find()
    res.render('admin/tables',{user})
    }else{
        res.redirect("/admin")
    }
}

const noCheckSession=async (req,res)=>{
    res.redirect("/")  
}

const CheckSession=async (req,res)=>{
    res.redirect('/admin/dashboard')
}

//delete user

const deleteUser=async(req,res)=>{

        const userId =req.params.id;
        const user=await User.findOneAndDelete({_id:userId}) 
        console.log(user)
        res.redirect('/admin/tables')
    }

    // Display the edit user form
const editUserForm =async (req, res) => {
    res.redirect("/admin/editUser")
  };
//get request        end here 

//post method start from here
const destroySession=async (req,res) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
            return res.sendStatus(500); 
          }
          res.redirect('/admin');
        });
      };

const editUser = (req, res) => {
    const userId = req.params.id;
    const updateUserData = req.body;
    res.redirect("/admin/editUser")
  };


const adminSession=async (req,res)=>{
    const email=req.body.email;
    const password=req.body.password;
    const valid= await DbAdmin.findOne({email:email})
    if(valid){
        if(password==valid.password){
            req.session.err = 'Invalid password';
        req.session.admin=email;
        console.log("session created")
        res.redirect('/admin/dashboard')  
        }else{
            req.session.err = 'Invalid password';
            
           res.redirect('/admin')
        }
    }else{
        req.session.err = 'User not found';
        res.redirect('/admin')
    }
}









  //product






  //

module.exports={
    adminLogin,
    adminPage,
    product,
    dashBoard,
    profiler,
    tables,
    adminSession,
    noCheckSession,
    CheckSession,
    deleteUser,
    editUserForm,
    editUser,
    destroySession
}