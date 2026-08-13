// POST /api/intake
//
// Takes a submission from the report page and commits it into this repo as a file.
// There is no database. The repo is the record, so a submission is a commit and the
// audit trail comes for free.
//
// Environment variables (set in Vercel project settings, never in the page):
//   GITHUB_TOKEN  fine-grained PAT with Contents: read and write on this repo only
//   SUBMIT_CODE   shared word the SIPS admin team enters once; keeps the open internet
//                 from committing to the repo. Not real auth, and not pretending to be.
//   GITHUB_REPO   optional, defaults to sipshealthcare/sbdops

const REPO = process.env.GITHUB_REPO || 'sipshealthcare/sbdops';
const API = `https://api.github.com/repos/${REPO}/contents`;

const AREAS = ['Staff and roster', 'Assessments', 'Observations', 'Schedule',
               'Foundations', 'Reports', 'DAVID', 'Somewhere else'];
const IMPACTS = ['Blocking me now', 'Slowing me down', 'Minor', 'Just an idea'];

const gh = (path, init = {}) => fetch(`${API}/${path}`, {
  ...init,
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(init.headers || {}),
  },
});

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

// Next ID. Reads the intake directory once and takes the highest number it finds.
// At this volume a collision needs two people submitting in the same second, and the
// worst case is a duplicate id on two files rather than a lost submission.
async function nextId() {
  const res = await gh('intake');
  if (res.status === 404) return 101;              // directory does not exist yet
  if (!res.ok) throw new Error(`list intake failed: ${res.status}`);
  const files = await res.json();
  const nums = files
    .map(f => (f.name.match(/^SBD-(\d+)/) || [])[1])
    .filter(Boolean)
    .map(Number);
  return nums.length ? Math.max(...nums) + 1 : 101;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Intake is not configured yet. GITHUB_TOKEN is missing.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { code, who, what, area, expected, impact } = body;

  if (process.env.SUBMIT_CODE && code !== process.env.SUBMIT_CODE) {
    return res.status(401).json({ error: 'That code is not right. Ask Ignacio for the current one.' });
  }

  // Validate rather than trust. A submission that arrives malformed is worse than one refused,
  // because it lands in the record looking like a real report.
  if (!who || !String(who).trim()) return res.status(400).json({ error: 'Tell us who you are.' });
  if (!what || String(what).trim().length < 10) {
    return res.status(400).json({ error: 'Say a little more about what happened.' });
  }
  if (String(what).length > 4000) return res.status(400).json({ error: 'That is longer than this form takes.' });
  if (area && !AREAS.includes(area)) return res.status(400).json({ error: 'Unknown area.' });
  if (impact && !IMPACTS.includes(impact)) return res.status(400).json({ error: 'Unknown impact.' });

  try {
    const id = await nextId();
    const ref = `SBD-${id}`;
    const now = new Date().toISOString();

    const record = {
      id: ref,
      submitted: now,
      who: String(who).trim().slice(0, 80),
      area: area || 'Somewhere else',
      impact: impact || 'Minor',
      what: String(what).trim(),
      expected: String(expected || '').trim().slice(0, 1000),
      // Triage fields. Empty on arrival by design: submitting changes nothing.
      status: 'new',
      severity: null,
      verdict: null,
      analysis: null,
      decision: null,
      decided: null,
      tracker: null,
    };

    const path = `intake/${ref}__${slug(who)}.json`;
    const put = await gh(path, {
      method: 'PUT',
      body: JSON.stringify({
        message: `Intake ${ref} from ${record.who}`,
        content: Buffer.from(JSON.stringify(record, null, 2)).toString('base64'),
      }),
    });

    if (!put.ok) {
      const detail = await put.text();
      console.error('[intake] commit failed', put.status, detail.slice(0, 300));
      return res.status(502).json({ error: 'Could not save that. Nothing was lost, please try once more.' });
    }

    return res.status(200).json({ ok: true, id: ref });
  } catch (err) {
    console.error('[intake]', err);
    return res.status(500).json({ error: 'Something went wrong on our side. Try again in a moment.' });
  }
}
