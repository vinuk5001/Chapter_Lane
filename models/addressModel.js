const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const addressSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  pincode: {
    type: String,
    required: true
  },

});

module.exports = mongoose.model('Address', addressSchema);
