const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username:{type:String,required:true,unique:true,trim:true,minlength:3,maxlength:32},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  phone:{type:String,required:true,unique:true,trim:true},
  avatar:{type:String,default:""},
  passwordHash:{type:String,required:true},
  role:{type:String,enum:["user","admin"],default:"user"},
  premium:{type:Boolean,default:false},
  premiumUntil:{type:Date,default:null},
  dailyLimit:{type:Number,default:100},
  apiKey:{type:String,default:null,unique:true,sparse:true},
  usedToday:{type:Number,default:0},
  usageDate:{type:String,default:""},
  lastIp:{type:String,default:""},
  createdAt:{type:Date,default:Date.now},
  updatedAt:{type:Date,default:Date.now}
});
UserSchema.index({username:1},{unique:true});
UserSchema.index({email:1},{unique:true});
UserSchema.index({phone:1},{unique:true});

const ResetSchema = new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
  codeHash:{type:String,required:true},
  expiresAt:{type:Date,required:true},
  attempts:{type:Number,default:0},
  createdAt:{type:Date,default:Date.now}
});
ResetSchema.index({expiresAt:1},{expireAfterSeconds:0});

const BlacklistSchema = new mongoose.Schema({
  ip:{type:String,required:true,unique:true},
  reason:{type:String,default:"Spam"},
  createdBy:{type:String,default:"admin"},
  createdAt:{type:Date,default:Date.now}
});

module.exports={
  User:mongoose.model("User",UserSchema),
  ResetCode:mongoose.model("ResetCode",ResetSchema),
  Blacklist:mongoose.model("Blacklist",BlacklistSchema)
};
