const mongoose = require('mongoose');

const DonationSchema = new mongoose.Schema(
{
foodName: {
type: String,
required: true,
trim: true
},

foodType: {
  type: String,
  enum: ['Rice', 'Vegetarian', 'Non-Vegetarian', 'Other'],
  required: true
},

quantity: {
  type: Number,
  required: true,
  min: 1
},

unit: {
  type: String,
  enum: ['Meals', 'Kg', 'Packets'],
  required: true
},

description: {
  type: String,
  default: ''
},

imageUrl: {
  type: String,
  default: ''
},

pickupInstructions: {
  type: String,
  default: ''
},

location: {
  type: String,
  required: true,
  trim: true
},

pickupTime: {
  type: Date,
  required: true
},

expiryTime: {
  type: Date,
  required: true
},

donorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: false
},

donorName: {
  type: String,
  required: true,
  trim: true
},

donorEmail: {
  type: String,
  required: true,
  lowercase: true,
  trim: true
},

status: {
  type: String,
  enum: ['Available', 'Requested', 'Collected', 'Expired'],
  default: 'Available'
}

},
{
timestamps: true
}
);

module.exports = mongoose.model('Donation', DonationSchema);
