import { list } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { blobs } = await list({ prefix: 'content.json' });
    const b = blobs.find((x) => x.pathname === 'content.json');
    if (!b) return res.status(200).json({});
    const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
    return res.status(200).json(await r.json());
  } catch (e) {
    return res.status(200).json({});
  }
}
