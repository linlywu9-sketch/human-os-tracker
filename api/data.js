export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const headers = { Authorization: `Bearer ${token}` };
  const KEY = 'human-os-data';

  try {
    // GET - read data
    if (req.method === 'GET') {
      const r = await fetch(`${url}/get/${KEY}`, { headers });
      const d = await r.json();
      return res.status(200).json({ data: d.result ? JSON.parse(d.result) : null });
    }

    // POST - write data
    if (req.method === 'POST') {
      const { data } = req.body || {};
      if (!data) return res.status(400).json({ error: '缺少 data 字段' });
      const r = await fetch(`${url}/set/${KEY}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(JSON.stringify(data)),
      });
      const d = await r.json();
      return res.status(200).json({ ok: d.result === 'OK' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
