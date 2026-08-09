const crypto=require("crypto");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcryptjs");
const settings=require("./settings");

function sign(user){return jwt.sign({sub:String(user._id),role:user.role},settings.jwtSecret,{expiresIn:"7d"});}
function verify(token){return jwt.verify(token,settings.jwtSecret);}
function randomKey(prefix="RX"){return prefix+"_"+crypto.randomBytes(18).toString("hex");}
function randomCode(){return String(Math.floor(100000+Math.random()*900000));}
async function hash(value){return bcrypt.hash(value,12);}
async function compare(value,hashed){return bcrypt.compare(value,hashed);}
function safeUser(u){return {id:u._id,username:u.username,email:u.email,phone:u.phone,avatar:u.avatar,role:u.role,premium:u.premium && u.premiumUntil && u.premiumUntil>Date.now(),premiumUntil:u.premiumUntil,dailyLimit:u.dailyLimit,usedToday:u.usedToday,apiKey:u.apiKey};}
module.exports={sign,verify,randomKey,randomCode,hash,compare,safeUser};
