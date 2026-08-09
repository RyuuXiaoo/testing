const express=require("express");
const {User,Blacklist}=require("./models");
const {auth,admin}=require("./middleware");
const {safeUser,randomKey}=require("./security");
const settings=require("./settings");
const {telegram}=require("./notifications");
const router=express.Router();
router.use(auth,admin);

router.get("/users",async(req,res)=>res.json({status:true,users:(await User.find().sort({createdAt:-1})).map(safeUser)}));

router.patch("/users/:id/premium",async(req,res)=>{
 try{
  const {enabled,days,limit}=req.body,u=await User.findById(req.params.id);if(!u)return res.status(404).json({status:false,message:"User tidak ditemukan."});
  u.premium=Boolean(enabled);
  if(u.premium){const d=Number(days)||settings.defaults.premiumDays;u.premiumUntil=new Date(Date.now()+d*86400000);u.dailyLimit=Number(limit)||settings.defaults.premiumDailyLimit;if(!u.apiKey)u.apiKey=randomKey("RX");}
  else {u.premiumUntil=null;u.apiKey=null;u.dailyLimit=settings.defaults.freeDailyLimit;}
  await u.save();await telegram(`💎 <b>Premium update</b>\nUser: <code>${u.username}</code>\nStatus: ${u.premium?"AKTIF":"FREE"}\nBerakhir: ${u.premiumUntil||"-"}`);
  res.json({status:true,user:safeUser(u)});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});

router.get("/blacklist",async(req,res)=>res.json({status:true,items:await Blacklist.find().sort({createdAt:-1})}));
router.post("/blacklist",async(req,res)=>{
 try{const {ip,reason="Spam"}=req.body;if(!ip)return res.status(400).json({status:false,message:"IP wajib diisi."});
  const b=await Blacklist.findOneAndUpdate({ip},{ip,reason,createdBy:req.user.username},{upsert:true,new:true});res.json({status:true,item:b});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});
router.delete("/blacklist/:ip",async(req,res)=>{await Blacklist.deleteOne({ip:req.params.ip});res.json({status:true,message:"IP dihapus dari blacklist."});});
module.exports=router;
