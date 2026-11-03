const mongoose = require('mongoose');

const collectionRequestSchema = new mongoose.Schema(
{
donationId: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Donation',
required: true
},

requesterId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},

requesterName: {
  type: String,
  required: true,
  trim: true
},

requesterEmail: {
  type: String,
  required: true,
  trim: true,
  lowercase: true
},

status: {
  type: String,
  enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
  default: 'Pending'
},

volunteerId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null
},

taskStatus: {
  type: String,
  enum: ['Available', 'Accepted', 'Collected', 'Delivered'],
  default: 'Available'
}

},
{
timestamps: true
}
);

module.exports = mongoose.model(
'CollectionRequest',
collectionRequestSchema
);
