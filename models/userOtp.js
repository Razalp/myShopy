const mongoose=require('mongoose');

const optSchema=mongoose.Schema({
    email:String,
    otp:String,
    createdAt:Date,
    expireAt:Date
})
module.exports=mongoose.model('userOtp',optSchema)