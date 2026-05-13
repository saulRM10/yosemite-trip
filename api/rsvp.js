// Vercel serverless function that proxies between the frontend and Google Apps Script.
// Why use a proxy? CORS + you keep the Apps Script URL private (in env vars, not in client JS).

export default async function handler(req, res) {
  const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

  if (!APPS_SCRIPT_URL) {
    return res.status(500).json({ error: 'APPS_SCRIPT_URL env var not set' });
  }

  // GET — list all RSVPs
  if (req.method === 'GET') {
    try {
      const r = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
      const data = await r.json();
      // Cache for 10s to reduce load when many people open the page
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      return res.status(200).json(data);
    } catch (err) {
      console.error('GET error:', err);
      return res.status(500).json({ error: 'Failed to load entries' });
    }
  }

  // POST — submit a new RSVP
  if (req.method === 'POST') {
    try {
      const r = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ error: 'Failed to save RSVP' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
