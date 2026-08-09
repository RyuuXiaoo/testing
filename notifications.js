const axios=require("axios");
const settings=require("./settings");
async function telegram(text){
  if(!settings.telegram.token || !settings.telegram.ownerId) return;
  try{
    await axios.post(`https://api.telegram.org/bot${settings.telegram.token}/sendMessage`,{
      chat_id:settings.telegram.ownerId,text,parse_mode:"HTML"
    },{timeout:10000});
  }catch(e){console.error("Telegram notification failed:",e.message);}
}
async function fonnte(phone,message){
  if(!settings.fonnteToken) throw new Error("FONNTE_TOKEN belum diisi.");
  const r=await axios.post("https://api.fonnte.com/send",{target:phone,message},{headers:{Authorization:settings.fonnteToken},timeout:15000});
  return r.data;
}
module.exports={telegram,fonnte};
