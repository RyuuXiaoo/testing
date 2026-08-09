# RyuuXiao Portal

Portal akun + API untuk deployment Node.js/Vercel.

## Fitur
- Login / register dengan MongoDB
- Profile: role, email, daily limit, status & tanggal berakhir premium
- Tukar username
- Foto profile via URL
- Premium: custom API key + daily limit
- Free: hanya API key `RyuuXiao`
- Forgot password: kode WhatsApp via Fonnte
- Admin: aktif/nonaktif premium, set durasi/limit, blacklist IP
- Notifikasi Telegram owner saat user baru, perubahan premium, dan premium mendekati berakhir
- Endpoint lama selain `ai`, `am`, `stalk` dihapus
- Vercel compatible + daily cron untuk reminder premium

## Setup lokal
1. Copy `.env.example` menjadi `.env`.
2. Isi `MONGODB_URI`, `JWT_SECRET`, `FONNTE_TOKEN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_ID`, dan `CRON_SECRET`.
3. Isi `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Akun admin otomatis dibuat saat database pertama kali tersambung.
4. `npm install`
5. `npm start`

## Vercel
Import project ini ke Vercel dan isi Environment Variables yang sama. `vercel.json` sudah menyiapkan route Node dan cron reminder premium.

Catatan: Fonnte, Telegram, dan MongoDB menggunakan secret environment. Jangan commit `.env`.
