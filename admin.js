import { put } from '@vercel/blob';
import { timingSafeEqual } from 'node:crypto';

const ok = (p) => {
  const a = Buffer.from(String(p || ''));
  const b = Buffer.from(process.env.ADMIN_PASSWORD || '');
  return b.length > 0 && a.length === b.length && timingSafeEqual(a, b);
};
const read = async (req) => {
  const chunks = [];
  let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > 4e6) throw new Error('File too large');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!ok(req.headers['x-admin-password'])) return res.status(401).json({ error: 'Wrong password' });
  const op = req.query.op;
  try {
    if (op === 'login') return res.status(200).json({ ok: true });
    const body = await read(req);
    if (op === 'save') {
      const d = JSON.parse(body.toString());
      if (!d || typeof d !== 'object' || !Array.isArray(d.products)) {
        return res.status(400).json({ error: 'Bad data' });
      }
      await put('content.json', JSON.stringify(d), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      return res.status(200).json({ ok: true });
    }
    if (op === 'upload') {
      const t = req.headers['content-type'] || '';
      if (!/^image\/(jpeg|png|webp)$/.test(t)) return res.status(400).json({ error: 'Images only' });
      const name = 'img/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
      const r = await put(name, body, { access: 'public', contentType: t, addRandomSuffix: false });
      return res.status(200).json({ url: r.url });
    }
    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
