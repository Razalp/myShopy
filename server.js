//used modules
const express=require("express");
const app=express();
const path=require('path');
const port=process.env.PORT||3007
const session = require('express-session');
const { v4: uuidv4 } = require('uuid'); // Import the uuidv4 function
const nocache =require('nocache');
const mongoose=require('mongoose');
const userRouter = require('./routes/userRoute')
const adminRouter = require('./routes/adminRoute'); 
const User=require('./models/userModel')
const morgan=require('morgan')
const flash=require('connect-flash')




//use items
app.use(express.json());
app.use(express.urlencoded({extended:true}));
// app.use(morgan('tiny'));
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'))
app.use(express.static('public'));
app.use(nocache());
app.use(flash());


//mongodb connection by using atlas;
//password :JwqbvGD8AtCrLmU5
    mongoose.connect("mongodb+srv://razalp0012300:BStTdKuDLANiN5HI@cluster0.qizwbpq.mongodb.net/?retryWrites=true&w=majority&appName=AtlasApp").then(()=>{
    console.log("mongodb connected")
})



const sessionSecret = uuidv4(); // Generate a unique session secret

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: true,
}));

app.use('/',userRouter)
app.use('/admin',adminRouter)

app.listen(port,()=>{
    console.log(`server is running http://localhost:${port}`)
})