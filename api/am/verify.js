const axios = require('axios');

module.exports = function (app) {
  const THERESA_GMAIL_BASE = process.env.THERESA_GMAIL_BASE || 'https://api.theresav.biz.id/premium/alightmotion';
  const THERESA_GMAIL_APIKEY = process.env.THERESA_GMAIL_APIKEY || 'RyuuXiao';

  app.get('/am/verify', async (req, res) => {
    const { email, link, apikey } = req.query;

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

    if (!link) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "link" diperlukan.'
      });
    }

    try {
      const response = await axios.get(`${THERESA_GMAIL_BASE}/verify`, {
        params: {
          email,
          link,
          apikey: THERESA_GMAIL_APIKEY
        },
        timeout: 30000
      });

      return res.status(200).json({
        status: true,
        source: 'xs-pedia',
        endpoint: 'verify',
        message: 'Link berhasil diverifikasi.',
        data: {
          email,
          link,
          upstream: response.data
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        source: 'xs-pedia',
        endpoint: 'verify',
        message: error.response?.data?.message || error.message || 'Gagal memverifikasi link.'
      });
    }
  });
};
