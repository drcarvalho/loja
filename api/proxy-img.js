export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    return res.status(204).end();
  }

  let url = req.query?.url;
  if (Array.isArray(url)) url = url[0];

  if (!url && req.url) {
    try {
      const parsed = new URL(req.url, 'http://localhost');
      url = parsed.searchParams.get('url');
    } catch {
      // handled below
    }
  }

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  // Allow only HTTP(S) images from approved Yupoo domains
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const hostname = urlObj.hostname.toLowerCase();
  const isAllowedProtocol = urlObj.protocol === 'https:' || urlObj.protocol === 'http:';
  const isAllowedDomain = hostname === 'yupoo.com' || hostname.endsWith('.yupoo.com');

  if (!isAllowedProtocol || !isAllowedDomain) {
    return res.status(400).json({ error: 'Domínio não permitido' });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://wanfing.x.yupoo.com/'
  };

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(urlObj.toString(), {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Yupoo returned ${response.status}` });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (req.method === 'HEAD') {
        const len = response.headers.get('content-length');
        if (len) res.setHeader('Content-Length', len);
        return res.status(200).end();
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      return res.status(200).send(buffer);
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(502).json({
    error: 'Failed to proxy image',
    details: lastError?.message || 'Unknown upstream error'
  });
}
