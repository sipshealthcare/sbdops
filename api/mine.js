// GET /api/mine?who=<name>&code=<submit code>
//
// Returns that person's own submissions and where each one got to. Nothing else.
// A submitter sees their own items, never the board and never anyone else's report,
// because the moment they can see the queue they start comparing their item to other
// people's instead of just telling us what happened.
//
// Reads straight from the repo. Same store as intake, no database.

const REPO = process.env.GITHUB_REPO || 'sipshealthcare/sbdops';
const API = `https://api.github.com/repos/${REPO}/contents`;

const gh = path => fetch(`${API}/${path}`, {
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  },
});

const slug = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'Not configured yet.' });

  const { who, code } = req.query;
  if (process.env.SUBMIT_CODE && code !== process.env.SUBMIT_CODE) {
    return res.status(401).json({ error: 'That code is not right.' });
  }
  if (!who) return res.status(400).json({ error: 'Who?' });

  try {
    const list = await gh('intake');
    if (list.status === 404) return res.status(200).json({ items: [] });
    if (!list.ok) throw new Error(`list failed: ${list.status}`);

    // The submitter is in the filename, so we filter before fetching anything.
    // That keeps this to one request plus one per item that is actually theirs.
    const mine = (await list.json()).filter(f => f.name.includes(`__${slug(who)}.json`));

    const items = (await Promise.all(mine.map(async f => {
      try {
        const r = await fetch(f.download_url);
        return r.ok ? await r.json() : null;
      } catch { return null; }
    }))).filter(Boolean);

    items.sort((a, b) => (b.submitted || '').localeCompare(a.submitted || ''));

    // Only ever three outcomes go back to a submitter: done, in progress, or tabled.
    // Nothing reads as a refusal, because tabled is honest and leaves the door open.
    const label = it => {
      if (it.status === 'shipped') return { text: 'Done', tone: 'grn' };
      if (it.status === 'approved') return { text: 'In progress', tone: 'amb' };
      if (it.status === 'tabled' || it.status === 'closed') return { text: 'Tabled', tone: 'gry' };
      return { text: 'Looking at it', tone: 'gry' };
    };

    return res.status(200).json({
      items: items.map(it => ({
        id: it.id,
        what: it.what,
        submitted: it.submitted,
        answer: it.analysis || it.verdict || null,
        decided: it.decided || null,
        ...label(it),
      })),
    });
  } catch (err) {
    console.error('[mine]', err);
    return res.status(500).json({ error: 'Could not load those right now.' });
  }
}
