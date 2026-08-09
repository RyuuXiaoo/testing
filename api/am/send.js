const axios = require('axios');

module.exports = function (app) {
  const THERESA_GMAIL_BASE = process.env.THERESA_GMAIL_BASE || 'https://api.theresav.biz.id/premium/alightmotion';
  const THERESA_GMAIL_APIKEY = process.env.THERESA_GMAIL_APIKEY || 'RyuuXiao';

  app.get('/am/send', async (req, res) => {
    const { email, apikey } = req.query;

    if (!global.apikeyf || !global.apikeyf.includes(apikey)) {
      return res.status(403).json({
        status: false,
        message: 'Apikey tidak valid.'
      });
    }

    if (!email) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "email" diperlukan.'
      });
    }

    try {
      const response = await axios.get(`${THERESA_GMAIL_BASE}/send`, {
        params: {
          email,
          apikey: THERESA_GMAIL_APIKEY
        },
        timeout: 30000
      });

      return res.status(200).json({
        status: true,
        source: 'xs-pedia',
        endpoint: 'send',
        message: 'Link verifikasi berhasil dikirim.',
        data: {
          email,
          upstream: response.data
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        source: 'xs-pedia',
        endpoint: 'send',
        message: error.response?.data?.message || error.message || 'Gagal mengirim link verifikasi.'
      });
    }
  });
};
