const YUPOO_BASE_URL = 'https://wanfing.x.yupoo.com';
const CATEGORY_URL = `${YUPOO_BASE_URL}/categories/3852491`;

const PRODUCT_TYPE_PRICES = {
  fan: 8.00,
  player: 10.00,
  fan_long_sleeve: 11.00,
  long_sleeve: 13.00,
  retro_long_sleeve: 17.00,
  retro: 12.00,
  shorts: 8.00,
  training_kit: 22.00,
  tracksuit_full_zip: 40.00,
  tracksuit_zip: 39.00,
  kids: 10.00,
  kids_retro: 14.00,
  nba: 18.00
};

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x3D;/gi, '=')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .trim();
}

function inferItemType(title) {
  const lower = title.toLowerCase();
  const isRetro = lower.includes('retro');
  const isLongSleeve = lower.includes('long sleeve') || lower.includes('manga longa');
  const isKids = lower.includes('kids') || lower.includes('kid') || lower.includes('children');

  if (lower.includes('nba')) return 'nba';
  if (lower.includes('full zip') && (lower.includes('tracksuit') || lower.includes('suit'))) return 'tracksuit_full_zip';
  if (lower.includes('tracksuit') || (lower.includes('zip') && lower.includes('jacket'))) return 'tracksuit_zip';
  if (lower.includes('training')) return 'training_kit';
  if (lower.includes('shorts') && !lower.includes('kit')) return 'shorts';
  if (isKids && isRetro) return 'kids_retro';
  if (isKids) return 'kids';
  if (isRetro && isLongSleeve) return 'retro_long_sleeve';
  if (lower.includes('fan') && isLongSleeve) return 'fan_long_sleeve';
  if (isLongSleeve) return 'long_sleeve';
  if (isRetro) return 'retro';
  if (lower.includes('player')) return 'player';
  return 'fan';
}

function extractModelAndSizes(title) {
  const sizeMatch = title.match(/\b((?:Kids?\s*)?(?:S|XS|M|L|XL|XXL|XXXL|XXXXL|\d{2})[-–](?:S|M|L|XL|XXL|XXXL|XXXXL|X{2,5}L|\d{2}))\b/i);
  const sizeRange = sizeMatch ? sizeMatch[1] : 'S-XXL';
  const model = sizeMatch ? title.replace(sizeMatch[0], '').replace(/\s{2,}/g, ' ').trim() : title;
  return { model: model || title, sizeRange };
}

function parseYupooCategoryHtml(html) {
  const items = [];
  const seenIds = new Set();
  const blockRegex = /<div\s+class="categories__children">([\s\S]*?)<\/div>\s*(?=<div\s+class="categories__children">|<\/div>)/g;
  const fallbackRegex = /<a[^>]*class="album__main"[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>[\s\S]*?<div[^>]*class="[^"]*album__title[^"]*"[^>]*>([\s\S]*?)<\/div>/g;

  const parseAnchor = (chunk, titleHint) => {
    const hrefMatch = chunk.match(/href="([^"]+)"/);
    const titleAttrMatch = chunk.match(/title="([^"]*)"/);
    const imgMatch = chunk.match(/<img[^>]+(?:data-origin-src|data-src|src)="([^"]+)"/i);

    if (!hrefMatch) return null;
    const rawHref = decodeHtmlEntities(hrefMatch[1]);
    const yupooUrl = rawHref.startsWith('http') ? rawHref : `${YUPOO_BASE_URL}${rawHref}`;

    const rawTitle = decodeHtmlEntities(titleHint || (titleAttrMatch ? titleAttrMatch[1] : ''));
    if (!rawTitle || rawTitle === '.' || rawTitle === '..') return null;

    let imageUrl = imgMatch ? decodeHtmlEntities(imgMatch[1]) : '';
    if (imageUrl.startsWith('//')) imageUrl = `https:${imageUrl}`;
    if (!imageUrl) return null;

    const albumIdMatch = rawHref.match(/\/albums\/(\d+)/);
    const safeFallback = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'item';
    const albumId = albumIdMatch ? albumIdMatch[1] : safeFallback;
    const itemId = `yp_${albumId}`;
    if (seenIds.has(itemId)) return null;
    seenIds.add(itemId);

    const itemType = inferItemType(rawTitle);
    const priceUsd = PRODUCT_TYPE_PRICES[itemType] || 8.00;
    const { model, sizeRange } = extractModelAndSizes(rawTitle);

    return {
      id: itemId,
      title: rawTitle,
      model,
      size_range: sizeRange,
      sizes: ['P (S)', 'M (M)', 'G (L)', 'GG (XL)', '2XL (XG)', '3XL', '4XL'],
      price: priceUsd,
      price_usd: priceUsd,
      image: imageUrl,
      yupoo_url: yupooUrl,
      category: 'Futebol & Esportes',
      item_type: itemType,
      source: 'yupoo-live'
    };
  };

  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const block = match[1];
    const titleDiv = block.match(/<div[^>]*class="[^"]*album__title[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const item = parseAnchor(block, titleDiv ? titleDiv[1] : '');
    if (item) items.push(item);
  }

  if (items.length === 0) {
    while ((match = fallbackRegex.exec(html)) !== null) {
      const item = parseAnchor(match[0], match[2]);
      if (item) items.push(item);
    }
  }

  return items;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  let pageParam = req.query?.page;
  if (Array.isArray(pageParam)) pageParam = pageParam[0];
  if (!pageParam && req.url) {
    try {
      pageParam = new URL(req.url, 'http://localhost').searchParams.get('page');
    } catch {
      pageParam = '1';
    }
  }

  const pageNum = Math.max(1, Math.min(5, parseInt(pageParam || '1', 10) || 1));
  const targetUrl = pageNum > 1 ? `${CATEGORY_URL}?page=${pageNum}` : CATEGORY_URL;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Yupoo returned ${response.status}` });
    }

    const html = await response.text();
    const products = parseYupooCategoryHtml(html);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(products);
  } catch (error) {
    return res.status(502).json({ error: 'Failed to fetch Yupoo catalog', details: error.message });
  }
}
