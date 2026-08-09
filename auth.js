const express=require("express");
const bcrypt=require("bcryptjs");
const {User,ResetCode}=require("./models");
const {hash,compare,sign,randomKey,randomCode,safeUser}=require("./security");
const {fonnte,telegram}=require("./notifications");
const settings=require("./settings");
const {auth,ipOf}=require("./middleware");
const router=express.Router();

router.post("/register",async(req,res)=>{
 try{
  const {username,email,phone,password,avatar=""}=req.body;
  if(!username||!email||!phone||!password)return res.status(400).json({status:false,message:"Username, email, nomor TLP dan password wajib diisi."});
  if(!/^[a-zA-Z0-9_.-]{3,32}$/.test(username))return res.status(400).json({status:false,message:"Username 3-32 karakter."});
  if(password.length<6)return res.status(400).json({status:false,message:"Password minimal 6 karakter."});
  if(avatar && !/^https?:\/\//i.test(avatar))return res.status(400).json({status:false,message:"Foto profile harus berupa URL http/https."});
  if(await User.findOne({$or:[{username},{email:email.toLowerCase()},{phone}]}))return res.status(409).json({status:false,message:"Username, email, atau nomor TLP sudah digunakan."});
  const u=await User.create({username,email:email.toLowerCase(),phone,avatar,passwordHash:await hash(password),dailyLimit:settings.defaults.freeDailyLimit,lastIp:ipOf(req)});
  await telegram(`🆕 <b>User baru</b>\nUsername: <code>${u.username}</code>\nEmail: <code>${u.email}</code>\nIP: <code>${u.lastIp}</code>`);
  res.json({status:true,message:"Pendaftaran berhasil.",token:sign(u),user:safeUser(u)});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});

router.post("/login",async(req,res)=>{
 try{
  const {login,password}=req.body; const u=await User.findOne({$or:[{username:login},{email:String(login).toLowerCase()},{phone:login}]});
  if(!u||!(await compare(password,u.passwordHash)))return res.status(401).json({status:false,message:"Login atau password salah."});
  u.lastIp=ipOf(req);u.updatedAt=new Date();await u.save();
  res.json({status:true,token:sign(u),user:safeUser(u)});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});

router.post("/forgot/request",async(req,res)=>{
 try{
  const {phone}=req.body,u=await User.findOne({phone});
  if(!u)return res.status(404).json({status:false,message:"Nomor TLP tidak ditemukan."});
  const code=randomCode(); await ResetCode.deleteMany({userId:u._id});
  await ResetCode.create({userId:u._id,codeHash:await hash(code),expiresAt:new Date(Date.now()+10*60*1000)});
  await fonnte(phone,`Kode reset password RyuuXiao kamu: ${code}\nBerlaku 10 menit. Jangan berikan kode ini kepada siapa pun.`);
  res.json({status:true,message:"Kode reset telah dikirim ke WhatsApp."});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});
router.post("/forgot/reset",async(req,res)=>{
 try{
  const {phone,code,newPassword}=req.body;if(!phone||!code||!newPassword)return res.status(400).json({status:false,message:"Nomor, kode dan password baru wajib diisi."});
  if(newPassword.length<6)return res.status(400).json({status:false,message:"Password minimal 6 karakter."});
  const u=await User.findOne({phone}), r=u&&await ResetCode.findOne({userId:u._id});
  if(!r||r.expiresAt<Date.now()||!(await compare(code,r.codeHash)))return res.status(400).json({status:false,message:"Kode salah atau sudah kedaluwarsa."});
  u.passwordHash=await hash(newPassword);u.updatedAt=new Date();await u.save();await r.deleteOne();
  res.json({status:true,message:"Password berhasil diubah."});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});

router.get("/me",auth,async(req,res)=>res.json({status:true,user:safeUser(req.user)}));

router.patch("/profile",auth,async(req,res)=>{
 try{
  const {avatar}=req.body;
  if(avatar!==undefined && avatar && !/^https?:\/\//i.test(avatar))return res.status(400).json({status:false,message:"Avatar harus URL http/https."});
  if(avatar!==undefined)req.user.avatar=avatar;
  req.user.updatedAt=new Date();await req.user.save();
  res.json({status:true,user:safeUser(req.user)});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});

router.patch("/username",auth,async(req,res)=>{
 try{
  const {username}=req.body;
  if(!/^[a-zA-Z0-9_.-]{3,32}$/.test(username||""))return res.status(400).json({status:false,message:"Username tidak valid."});
  if(await User.findOne({username,_id:{$ne:req.user._id}}))return res.status(409).json({status:false,message:"Username sudah digunakan."});
  req.user.username=username;await req.user.save();res.json({status:true,message:"Username berhasil ditukar.",user:safeUser(req.user)});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});
router.patch("/apikey",auth,async(req,res)=>{
 try{
  if(!(req.user.premium&&req.user.premiumUntil>Date.now()))return res.status(403).json({status:false,message:"Custom API key hanya untuk premium."});
  const key=String(req.body.apiKey||"").trim();
  if(!/^[A-Za-z0-9_-]{8,64}$/.test(key))return res.status(400).json({status:false,message:"API key 8-64 karakter, hanya huruf, angka, _ dan -."});
  const used=await User.findOne({apiKey:key,_id:{$ne:req.user._id}});
  if(used)return res.status(409).json({status:false,message:"API key sudah digunakan."});
  req.user.apiKey=key;await req.user.save();res.json({status:true,message:"Custom API key tersimpan.",apiKey:key});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});

router.post("/apikey/regenerate",auth,async(req,res)=>{
 try{
  if(!(req.user.premium&&req.user.premiumUntil>Date.now()))return res.status(403).json({status:false,message:"Custom API key hanya untuk premium."});
  req.user.apiKey=randomKey("RX");await req.user.save();res.json({status:true,apiKey:req.user.apiKey});
 }catch(e){res.status(500).json({status:false,message:e.message});}
});
module.exports=router;
