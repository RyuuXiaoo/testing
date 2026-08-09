const axios=require('axios');
global.fetchJson=async(url,options={})=>{try{return (await axios.get(url,{headers:{'User-Agent':'Mozilla/5.0'},...options})).data}catch(e){return e}};
global.getBuffer=async(url,options={})=>(await axios.get(url,{responseType:'arraybuffer',...options})).data;
global.runtime=(s=process.uptime())=>{s=Math.floor(s);const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),x=s%60;return `${d?d+'d ':''}${h?h+'h ':''}${m?m+'m ':''}${x}s`};
global.totalreq=0;
