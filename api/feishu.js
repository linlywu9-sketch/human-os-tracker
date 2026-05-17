const BASE = 'https://open.feishu.cn/open-apis';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function getToken() {
  const r = await fetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET,
    }),
  });
  const d = await r.json();
  if (!d.tenant_access_token) throw new Error('获取飞书 token 失败: ' + JSON.stringify(d));
  return d.tenant_access_token;
}

const recordsUrl = () =>
  `${BASE}/bitable/v1/apps/${process.env.FEISHU_APP_TOKEN}/tables/${process.env.FEISHU_TABLE_ID}/records`;

function toFeishuFields(f) {
  const out = {};
  if (f.stream_id != null) out['板块ID'] = Number(f.stream_id);
  if (f.stream_name)       out['板块名称'] = f.stream_name;
  if (f.name)              out['子项目'] = f.name;
  if (f.status)            out['状态'] = f.status;
  if (f.milestone)         out['里程碑'] = f.milestone;
  if (f.owner)             out['负责人'] = f.owner;
  if (f.date)              out['日期'] = new Date(f.date).getTime();
  return out;
}

// Vercel format: export default async function
export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await getToken();
    const auth = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const body = req.body || {};
    const { method, recordId, fields } = body;

    // LIST
    if (req.method === 'GET' || method === 'list') {
      let items = [], pageToken = '';
      do {
        const url = `${recordsUrl()}?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`;
        const r = await fetch(url, { headers: auth });
        const d = await r.json();
        if (d.code !== 0) throw new Error('飞书错误: ' + JSON.stringify(d));
        items = items.concat(d.data.items || []);
        pageToken = d.data.has_more ? d.data.page_token : '';
      } while (pageToken);
      return res.status(200).json({ items });
    }

    // CREATE
    if (method === 'create') {
      const r = await fetch(recordsUrl(), {
        method: 'POST', headers: auth,
        body: JSON.stringify({ fields: toFeishuFields(fields) }),
      });
      const d = await r.json();
      if (d.code !== 0) throw new Error(JSON.stringify(d));
      return res.status(200).json(d.data.record);
    }

    // UPDATE
    if (method === 'update') {
      const r = await fetch(`${recordsUrl()}/${recordId}`, {
        method: 'PUT', headers: auth,
        body: JSON.stringify({ fields: toFeishuFields(fields) }),
      });
      const d = await r.json();
      if (d.code !== 0) throw new Error(JSON.stringify(d));
      return res.status(200).json(d.data.record);
    }

    // DELETE
    if (method === 'delete') {
      await fetch(`${recordsUrl()}/${recordId}`, { method: 'DELETE', headers: auth });
      return res.status(200).json({ deleted: true });
    }

    return res.status(400).json({ error: '未知 method' });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
