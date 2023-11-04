const mongoose=require('mongoose');





const userSchema=mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    name:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    mobile:{
        type:Number,
        required:true
    },
    isAdmin: {
        type:Boolean,
        default: false
    },
    is_blocked:{
        type:Boolean,
        default:false
    },
    profileImage:{
        type:String
    }
    , address: [
        {
            newname:{
                type:String
            },
            house: {
                 type: String
                },
            post: {
                 type: Number 
                },
            city: {
                 type: String
                 },
            state: {
                 type: String 
                },
            district: {
                 type: String
                 },
            contact:{
                type:Number
            }
            
        }
    ],cart: [
        {
            product: {
                type: mongoose.Types.ObjectId,
                ref: 'products'
            },
            quantity: {
                type: Number,
            },
            price: {
                type: Number,
            },
            size:{
                type:String
            },
            color:{
                type:String
            },
            total: Number

        }
    ],
    wallet: {

        balance: {
            type: Number,
      default: 0
        },
        transactions: {
            transactionDescription:{type:String},
            Date:{type:Date}
        }

    },
      
   
    usedCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],
    resetPasswordToken:{type:String},
    resetPasswordExpires:Date


})
module.exports=mongoose.model("User",userSchema)