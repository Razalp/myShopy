const mongoose=require('mongoose');

const notification=new mongoose.Schema({
    notification:{
        type:String
    },
    notificationDate: {
        type: Date,
        default: Date.now
      }
})
module.exports = mongoose.model('notification',notification)