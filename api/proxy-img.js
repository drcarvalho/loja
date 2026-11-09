export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  // Allow only images from approved Yupoo domains (any subdomain of yupoo.com)
  const urlObj = new URL(url);
  if (!urlObj.hostname.endsWith('.yupoo.com')) {
    return res.status(400).json({ error: "Domínio não permitido" });
  }
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://wanfing.x.yupoo.com/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Yupoo returned ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/png';
    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(502).json({ error: 'Failed to proxy image', details: error.message });
  }
}

