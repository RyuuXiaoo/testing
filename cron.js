const express=require("express");
const {User}=require("./models");
const settings=require("./settings");
const {telegram}=require("./notifications");
const router=express.Router();
router.get("/premium-notify",async(req,res)=>{
 if(req.headers.authorization!==`Bearer ${settings.cronSecret}`)return res.status(401).json({status:false,message:"Unauthorized"});
 const now=Date.now(), targets=[7,3,1], out=[];
 for(const days of targets){
  const min=new Date(now+days*86400000-12*3600000),max=new Date(now+days*86400000+12*3600000);
  const users=await User.find({premium:true,premiumUntil:{$gte:min,$lte:max}});
  for(const u of users){await telegram(`⏰ <b>Premium akan berakhir</b>\nUser: <code>${u.username}</code>\nSisa: sekitar ${days} hari\nTanggal: ${u.premiumUntil.toLocaleString("id-ID")}`);out.push(u.username);}
 }
 res.json({status:true,notified:out});
});
module.exports=router;
