const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  gender: {
     type: String, 
    required: true
   },
  subcategories: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'subcategory'
   }]
});

module.exports = mongoose.model('category', categorySchema);
