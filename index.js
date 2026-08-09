require("dotenv").config();
require("./function.js");
const express=require("express"),cors=require("cors"),path=require("path"),fs=require("fs");
const {connectDB}=require("./db");
const {User,Blacklist}=require("./models");
const {guardIP,ipOf}=require("./middleware");
const settings=require("./settings");
const { endpoints, categories, grouped } = require("./endpoint");
const app=express();
app.set("trust proxy",true);app.use(cors());app.use(express.json({limit:"1mb"}));app.use(express.urlencoded({extended:false}));
let dbReady;
app.use(async(req,res,next)=>{try{dbReady ||= connectDB();await dbReady;next();}catch(e){res.status(500).json({status:false,message:"Database belum siap.",detail:process.env.NODE_ENV==="production"?undefined:e.message});}});
let adminReady=false;
async function ensureAdmin(){
 if(adminReady || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) return;
 const bcrypt=require("bcryptjs");
 const {User}=require("./models");
 const exists=await User.findOne({role:"admin"});
 if(!exists){
  await User.create({username:process.env.ADMIN_USERNAME,email:process.env.ADMIN_EMAIL||"admin@example.com",phone:process.env.ADMIN_PHONE||"0000000000",passwordHash:await bcrypt.hash(process.env.ADMIN_PASSWORD,12),role:"admin",dailyLimit:999999});
  console.log("Initial admin account created.");
 }
 adminReady=true;
}
app.use(async(req,res,next)=>{try{await ensureAdmin();next();}catch(e){next(e);}});

app.use(guardIP);

// API key gate: existing AI/AM/Stalk files still validate against these global arrays.
app.use(async(req,res,next)=>{
 try{
  const keys=await User.find({premium:true,premiumUntil:{$gt:new Date()},apiKey:{$ne:null}}).select("apiKey").lean();
  global.apikeyf=[settings.defaults.freeApiKey,...keys.map(x=>x.apiKey).filter(Boolean)];
  global.apikeyp=global.apikeyf;
  if(/^\/(ai|am|stalk)(\/|$)/.test(req.path)){
    const key=req.query.apikey;
    if(!key || !global.apikeyf.includes(key)) return res.status(403).json({status:false,message:"Apikey tidak valid."});
    if(key!==settings.defaults.freeApiKey){
      const u=await User.findOne({apiKey:key,premium:true,premiumUntil:{$gt:new Date()}});
      if(!u) return res.status(403).json({status:false,message:"Premium tidak aktif."});
      const today=new Date().toISOString().slice(0,10);
      if(u.usageDate!==today){u.usageDate=today;u.usedToday=0;}
      if(u.usedToday>=u.dailyLimit)return res.status(429).json({status:false,message:"Limit harian habis.",limit:u.dailyLimit});
      u.usedToday+=1;await u.save();
    }
    global.totalreq=(global.totalreq||0)+1;
  }
  next();
 }catch(e){next(e);}
});
app.use(express.static(path.join(__dirname,"public")));
app.use("/auth",require("./auth"));
app.use("/admin",require("./admin"));
app.use("/internal",require("./cron"));

app.get("/api/health",(req,res)=>res.json({status:true,name:"RyuuXiao Portal",database:"connected"}));
app.get("/api/docs",(req,res)=>res.json({status:true,apis:["ai","am","stalk"],freeApiKey:settings.defaults.freeApiKey,endpointCount:endpoints.length,categories}));
app.get("/api/endpoints",(req,res)=>res.json({status:true,freeApiKey:settings.defaults.freeApiKey,categories,endpoints}));
app.get("/api/endpoints.json",(req,res)=>res.json(grouped));
app.get("/docs",(req,res)=>res.sendFile(path.join(__dirname,"public","docs","index.html")));

// Load ONLY AI, AM and STALK modules.
for(const folder of ["ai","am","stalk"]){
 const dir=path.join(__dirname,"api",folder);
 if(fs.existsSync(dir)) for(const file of fs.readdirSync(dir).filter(x=>x.endsWith(".js"))){
   try{require(path.join(dir,file))(app);}catch(e){console.error(`Failed ${folder}/${file}:`,e.message);}
 }
}

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
if(require.main===module)app.listen(process.env.PORT||3000,()=>console.log(`RyuuXiao Portal running on ${process.env.PORT||3000}`));
module.exports=app;
