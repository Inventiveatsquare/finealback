const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const UserSchema = new Schema({
  userids: {
    type: String
  },
  musername: {
    type: String
  },
  first_name: {
    type: String
  },
  last_name: {
    type: String
  },
  amount: {
    type: String
  },
  email: {
    type: String
  },
  phone_number: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = Invoice = mongoose.model("invoice", UserSchema);
