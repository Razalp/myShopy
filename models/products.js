const mongoose = require('mongoose')

const productSchema = mongoose.Schema({
  title: String,
  color: String,
  gender: { type: String },

  category: {
    type: String
  },
  rating: [
    {
      customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the actual collection name
        required: true
      },
      rate: {
        type: Number,
      },
      review: {
        type: String
      }
    }
  ],

  size: [String],
  price: Number,
  stock: Number,
  description: String,
  images: [String],
  deleted: {
    type: Boolean,
    default: false
  }
})


module.exports = mongoose.model('products', productSchema)