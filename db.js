const mongoose = require("mongoose");
const settings = require("./settings");

let promise;
async function connectDB(){
  if(!settings.mongodb.uri) throw new Error("MONGODB_URI belum diisi.");
  if(mongoose.connection.readyState===1) return mongoose.connection;
  if(!promise) promise=mongoose.connect(settings.mongodb.uri,settings.mongodb.options);
  await promise;
  return mongoose.connection;
}
module.exports={connectDB};
