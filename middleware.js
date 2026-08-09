const {User,Blacklist}=require("./models");
const {verify}=require("./security");
const settings=require("./settings");

function ipOf(req){
  const raw=(req.headers["x-forwarded-for"]||req.socket.remoteAddress||"").split(",")[0].trim();
  return raw.replace(/^::ffff:/,"") || "unknown";
}
async function auth(req,res,next){
  try{
    const h=req.headers.authorization||"";
    const token=h.startsWith("Bearer ")?h.slice(7):null;
    if(!token) return res.status(401).json({status:false,message:"Login diperlukan."});
    const p=verify(token), user=await User.findById(p.sub);
    if(!user) return res.status(401).json({status:false,message:"Session tidak valid."});
    if(user.premium && user.premiumUntil && user.premiumUntil<=Date.now()){
      user.premium=false; user.apiKey=null; user.dailyLimit=settings.defaults.freeDailyLimit; await user.save();
    }
    req.user=user; req.clientIP=ipOf(req); next();
  }catch(e){return res.status(401).json({status:false,message:"Session tidak valid atau sudah habis."});}
}
function admin(req,res,next){if(req.user?.role!=="admin")return res.status(403).json({status:false,message:"Admin only."});next();}
async function guardIP(req,res,next){
  try{const b=await Blacklist.findOne({ip:ipOf(req)});if(b)return res.status(403).json({status:false,message:"IP diblacklist.",reason:b.reason});next();}
  catch(e){next(e);}
}
module.exports={auth,admin,guardIP,ipOf};
