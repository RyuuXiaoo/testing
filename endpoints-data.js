module.exports = [
  // System
  { category: "SYSTEM", method: "GET", name: "Health Check", path: "/api/health", params: "-", access: "PUBLIC", status: "ACTIVE", desc: "Cek status server dan database." },
  { category: "SYSTEM", method: "GET", name: "API Docs", path: "/api/docs", params: "-", access: "PUBLIC", status: "ACTIVE", desc: "Ringkasan akses API dan free key." },
  { category: "SYSTEM", method: "GET", name: "Endpoints Catalog", path: "/api/endpoints", params: "-", access: "PUBLIC", status: "ACTIVE", desc: "Daftar endpoint lengkap beserta kategori." },

  // Auth
  { category: "AUTH", method: "POST", name: "Register", path: "/auth/register", params: "username,email,phone,password,avatar?", access: "PUBLIC", status: "ACTIVE", desc: "Buat akun baru." },
  { category: "AUTH", method: "POST", name: "Login", path: "/auth/login", params: "login,password", access: "PUBLIC", status: "ACTIVE", desc: "Masuk dengan username/email/nomor." },
  { category: "AUTH", method: "POST", name: "Forgot Request", path: "/auth/forgot/request", params: "phone", access: "PUBLIC", status: "ACTIVE", desc: "Kirim kode reset via WhatsApp Fonnte." },
  { category: "AUTH", method: "POST", name: "Forgot Reset", path: "/auth/forgot/reset", params: "phone,code,newPassword", access: "PUBLIC", status: "ACTIVE", desc: "Ubah password setelah verifikasi." },
  { category: "AUTH", method: "GET", name: "Me", path: "/auth/me", params: "Bearer token", access: "PRIVATE", status: "ACTIVE", desc: "Ambil detail akun yang login." },
  { category: "AUTH", method: "PATCH", name: "Profile Photo", path: "/auth/profile", params: "avatar", access: "PRIVATE", status: "ACTIVE", desc: "Update foto profile via URL." },
  { category: "AUTH", method: "PATCH", name: "Change Username", path: "/auth/username", params: "username", access: "PRIVATE", status: "ACTIVE", desc: "Tukar username akun." },
  { category: "AUTH", method: "PATCH", name: "Custom API Key", path: "/auth/apikey", params: "apiKey", access: "PREMIUM", status: "ACTIVE", desc: "Set API key custom untuk premium." },
  { category: "AUTH", method: "POST", name: "Regenerate API Key", path: "/auth/apikey/regenerate", params: "-", access: "PREMIUM", status: "ACTIVE", desc: "Generate API key premium baru." },

  // Admin
  { category: "ADMIN", method: "GET", name: "List Users", path: "/admin/users", params: "Bearer admin token", access: "ADMIN", status: "ACTIVE", desc: "Lihat semua user dan premium status." },
  { category: "ADMIN", method: "PATCH", name: "Toggle Premium", path: "/admin/users/:id/premium", params: "enabled,days,limit", access: "ADMIN", status: "ACTIVE", desc: "Aktif/nonaktif premium, set durasi dan limit." },
  { category: "ADMIN", method: "GET", name: "List Blacklist", path: "/admin/blacklist", params: "Bearer admin token", access: "ADMIN", status: "ACTIVE", desc: "Lihat daftar IP yang diblokir." },
  { category: "ADMIN", method: "POST", name: "Add Blacklist", path: "/admin/blacklist", params: "ip,reason", access: "ADMIN", status: "ACTIVE", desc: "Blacklist IP spam." },
  { category: "ADMIN", method: "DELETE", name: "Remove Blacklist", path: "/admin/blacklist/:ip", params: "ip", access: "ADMIN", status: "ACTIVE", desc: "Hapus IP dari blacklist." },

  // AI
  { category: "AI", method: "GET", name: "DeepSeek", path: "/ai/deepseek?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Chat AI DeepSeek." },
  { category: "AI", method: "GET", name: "Gemini", path: "/ai/gemini?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Chat AI Gemini." },
  { category: "AI", method: "GET", name: "Lumin", path: "/ai/lumin?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Chat AI Lumin." },
  { category: "AI", method: "GET", name: "ChatGPT", path: "/ai/chatgpt?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Chat AI ChatGPT." },
  { category: "AI", method: "GET", name: "Dopple", path: "/ai/dopple?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Dopple AI." },
  { category: "AI", method: "GET", name: "Blackbox", path: "/ai/blackbox?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Blackbox AI." },
  { category: "AI", method: "GET", name: "Castorice", path: "/ai/castorice?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Castorice AI." },
  { category: "AI", method: "GET", name: "Turbo AI", path: "/ai/turboai?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Turbo AI." },
  { category: "AI", method: "GET", name: "GPT Turbo", path: "/ai/gptturbo?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with GPT Turbo." },
  { category: "AI", method: "GET", name: "Islam AI", path: "/ai/islam?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Chat AI Islam." },
  { category: "AI", method: "GET", name: "Koyuki AI", path: "/ai/koyuki?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Koyuki AI." },
  { category: "AI", method: "GET", name: "Claude", path: "/ai/claude?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Chat AI Claude." },
  { category: "AI", method: "GET", name: "Felo AI", path: "/ai/felo?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Felo AI." },
  { category: "AI", method: "GET", name: "Lumin AI", path: "/ai/luminai?text=&apikey=", params: "text,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Talk with Lumin AI." },

  // AM
  { category: "AM", method: "GET", name: "Send", path: "/am/send?email=&apikey=", params: "email,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Kirim email / otomasi AM." },
  { category: "AM", method: "GET", name: "Verify", path: "/am/verify?email=&link=&apikey=", params: "email,link,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Verifikasi email / link." },

  // Stalk
  { category: "STALK", method: "GET", name: "FF", path: "/stalk/ff?id=&apikey=", params: "id,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk Free Fire." },
  { category: "STALK", method: "GET", name: "FF2", path: "/stalk/ff2?uid=&apikey=", params: "uid,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk Free Fire (uid)." },
  { category: "STALK", method: "GET", name: "YouTube", path: "/stalk/youtube?username=&apikey=", params: "username,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk YouTube." },
  { category: "STALK", method: "GET", name: "TikTok", path: "/stalk/tiktok?username=&apikey=", params: "username,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk TikTok." },
  { category: "STALK", method: "GET", name: "NPM", path: "/stalk/npm?name=&apikey=", params: "name,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk package NPM." },
  { category: "STALK", method: "GET", name: "MLBB", path: "/stalk/mlbb2?userId=&zoneId=&apikey=", params: "userId,zoneId,apikey", access: "PREMIUM", status: "ACTIVE", desc: "Validasi Mobile Legends." },
  { category: "STALK", method: "GET", name: "Telegram", path: "/stalk/telegram?username=&apikey=", params: "username,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk Telegram." },
  { category: "STALK", method: "GET", name: "IG Stalk", path: "/stalk/igstalk?username=&apikey=", params: "username,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk Instagram." },
  { category: "STALK", method: "GET", name: "GitHub", path: "/stalk/github?username=&apikey=", params: "username,apikey", access: "FREE/PREMIUM", status: "ACTIVE", desc: "Stalk GitHub." }
];

module.exports.categories = ["ALL", "SYSTEM", "AUTH", "ADMIN", "AI", "AM", "STALK"];
