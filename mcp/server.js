#!/usr/bin/env node
/**
 * SBD Build — MCP server
 *
 * The dev team's half of the SBD OPS board, exposed to Claude Code so the queue can
 * be worked from the same place the code is written.
 *
 * Scope is deliberate and narrow. Every tool here calls exactly one of the database
 * functions that the /build page already calls, using the same publishable key that
 * already sits in that page's source. That means this server can do nothing a person
 * with the /build URL could not already do in a browser, and nothing at all to the
 * Belt platform, to intake, or to anyone else's surface.
 *
 * What it deliberately cannot do:
 *   - answer a decision (that is Ignacio's, and it stays his)
 *   - read or write intake
 *   - touch the Belt platform database in any way
 *   - delete anything
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const SB_URL = process.env.SBD_URL || 'https://uwgpjjbbfwqiumzfkwuy.supabase.co';
const SB_KEY = process.env.SBD_KEY || 'sb_publishable_USi4uTOHHwrNjKXB3-bbDQ_Gzk7PN2q';
/** Whose name goes on a confirmation, a question or an EOD when the caller omits it. */
const WHO = process.env.SBD_WHO || '';

const headers = () => ({
  'Content-Type': 'application/json',
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  Prefer: 'return=representation',
});

/** Errors from the database are written for humans. Pass them through unchanged. */
async function call(path, init) {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    cache: 'no-store',
    ...init,
    headers: headers(),
  });
  let body = null;
  try { body = await res.json(); } catch { /* empty body is fine */ }
  if (!res.ok) {
    const msg = (body && (body.message || body.hint || body.details)) || res.statusText;
    throw new Error(`${msg} (${res.status})`);
  }
  return body;
}
const rpc = (fn, args = {}) =>
  call(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) });
const query = (path) => call(path, { method: 'GET' });

const today = () => new Date().toISOString().slice(0, 10);
const days = (d) =>
  Math.round((new Date(`${d}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
/** The date in force: what they sent back if they sent one, otherwise what was proposed. */
const agreed = (t) => (t.date_state === 'countered' ? t.counter_on : t.proposed_on);

const ITEM_COLS =
  'number,title,status,priority,sprint,rank,origin,note,how_to_check,proposed_on,' +
  'date_state,counter_on,counter_note,answered_by,answered_at,shipped_on,verified_note,' +
  'updated_at,question_note,question_by,question_at,reply_note,reply_by,reply_at';

const DEC_COLS =
  'ref,question,blocks,note,raised_on,status,answer,reasoning,verdict,answered_on,' +
  'review_on,seen_at,seen_by,parent_ref,asked_by';

const openItems = (rows) => rows.filter((t) => t.status !== 'shipped');

/** One shape for an item everywhere, so the model never has to guess field names. */
function shapeItem(t) {
  const d = agreed(t);
  return {
    number: t.number,
    title: t.title,
    status: t.status,
    priority: t.priority,
    sprint: t.sprint,
    date: d || null,
    date_state: t.date_state || 'none',
    days_until: d ? days(d) : null,
    overdue: !!(d && days(d) < 0),
    origin: t.origin || null,
    note: t.note || null,
    how_to_check: t.how_to_check || null,
    shipped_on: t.shipped_on || null,
    verified: t.verified_note || null,
    question_open: !!(t.question_at && !t.reply_at),
    question: t.question_note || null,
    reply: t.reply_note || null,
  };
}

const ok = (data) => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
});
const text = (s) => ({ content: [{ type: 'text', text: s }] });

/* ------------------------------------------------------------------ tools */

const TOOLS = [
  {
    name: 'sbd_status',
    description:
      'Everything on the build board that is out of date or waiting on the dev team, in one call. ' +
      'Start here: it tells you how many items are past their date, how many proposed dates need ' +
      'an answer, whether the sprint tracker spreadsheet is behind, whether an end of day report ' +
      'is missing, and how many of Ignacio\'s answers are unread. Read this before doing anything else.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sbd_queue',
    description:
      'The open work, in the order the board puts it. Ranked items first, then by agreed date, ' +
      'then by priority. Use this to answer "what should I pick up".',
    inputSchema: {
      type: 'object',
      properties: {
        overdue_only: { type: 'boolean', description: 'Only items whose agreed date has passed.' },
        limit: { type: 'number', description: 'Cap the rows returned. Default 50.' },
      },
    },
  },
  {
    name: 'sbd_item',
    description: 'One tracker item in full, by its number, including its note and how to check it.',
    inputSchema: {
      type: 'object',
      properties: { number: { type: 'number', description: 'The tracker item number, e.g. 122.' } },
      required: ['number'],
    },
  },
  {
    name: 'sbd_dates_to_answer',
    description:
      'Dates Ignacio has proposed that are still waiting on the dev team to confirm or send back. ' +
      'These block his planning, so they are the cheapest thing to clear.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'sbd_confirm_date',
    description:
      'Accept the date Ignacio proposed on an item. Use only when the date is genuinely achievable. ' +
      'If it is not, use sbd_counter_date instead, which is never treated as a failure.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'Tracker item number.' },
        who: { type: 'string', description: 'Who is confirming. Defaults to SBD_WHO.' },
      },
      required: ['number'],
    },
  },
  {
    name: 'sbd_counter_date',
    description:
      'Send back a different date, with the reason. The reason is required and is taken as given, ' +
      'so write the real one. Works on an item whose date is still pending and on one whose ' +
      'agreed date has already passed, which is how a slip gets reported rather than going quiet.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'Tracker item number.' },
        date: { type: 'string', description: 'The date you can hit, as YYYY-MM-DD.' },
        reason: { type: 'string', description: 'Why it needs to move. Required.' },
        who: { type: 'string', description: 'Who is sending it back. Defaults to SBD_WHO.' },
      },
      required: ['number', 'date', 'reason'],
    },
  },
  {
    name: 'sbd_mark_done',
    description:
      'Mark an item done and take it off the queue. Evidence is required: say how you checked it ' +
      'is live in the running system, not that you believe it is. That line is published to leaders ' +
      'as the proof the item shipped, so write it for them.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'Tracker item number.' },
        evidence: {
          type: 'string',
          description:
            'How you checked it is live. For example "read the column straight back out of the ' +
            'live database" or "signed in as a granted assessor and reached the screen".',
        },
        who: { type: 'string', description: 'Who checked it. Defaults to SBD_WHO.' },
      },
      required: ['number', 'evidence'],
    },
  },
  {
    name: 'sbd_ask_ignacio',
    description:
      'Ask a question against a tracker item. The item shows as waiting on Ignacio until he replies, ' +
      'and stops counting against you. Use this rather than guessing at an ambiguous requirement.',
    inputSchema: {
      type: 'object',
      properties: {
        number: { type: 'number', description: 'Tracker item number.' },
        question: { type: 'string', description: 'What you need decided, in plain words.' },
        who: { type: 'string', description: 'Who is asking. Defaults to SBD_WHO.' },
      },
      required: ['number', 'question'],
    },
  },
  {
    name: 'sbd_answers',
    description:
      "Ignacio's answered decisions, newest first, with his reasoning and whether the team has " +
      'marked each one read. Anything unread is something he is waiting to hear landed.',
    inputSchema: {
      type: 'object',
      properties: {
        unread_only: { type: 'boolean', description: 'Only answers nobody has marked read yet.' },
      },
    },
  },
  {
    name: 'sbd_got_it',
    description:
      'Mark one of Ignacio\'s answers read, so he can see it reached the team and stops chasing it. ' +
      'Only do this once the answer has actually been read and is clear enough to build from.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Decision reference, e.g. D-022.' },
        who: { type: 'string', description: 'Who read it. Defaults to SBD_WHO.' },
      },
      required: ['ref'],
    },
  },
  {
    name: 'sbd_not_clear',
    description:
      'Say an answer is not enough to build from. Raises a new question linked to the original and ' +
      'puts it on Ignacio\'s board. Be specific about the gap: a vague follow up costs a round trip.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Decision reference the answer is on, e.g. D-022.' },
        question: { type: 'string', description: 'What is missing, and what you would need to know.' },
        who: { type: 'string', description: 'Who is asking. Defaults to SBD_WHO.' },
      },
      required: ['ref', 'question'],
    },
  },
  {
    name: 'sbd_propose_from_answer',
    description:
      'Turn one of Ignacio\'s answers into a dated tracker item. Use when an answer means something ' +
      'has to get built. You set the date you can hit; it reaches Ignacio as a date sent to him and ' +
      'he agrees it or sends back a different one. The decision is kept as the item\'s origin.',
    inputSchema: {
      type: 'object',
      properties: {
        ref: { type: 'string', description: 'Decision reference the work comes from, e.g. D-022.' },
        title: { type: 'string', description: 'What gets built, in one line.' },
        date: { type: 'string', description: 'The date you can hit, as YYYY-MM-DD.' },
        reason: { type: 'string', description: 'Optional. Anything Ignacio should know about the date.' },
        priority: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Defaults to medium.',
        },
        who: { type: 'string', description: 'Who is proposing. Defaults to SBD_WHO.' },
      },
      required: ['ref', 'title', 'date'],
    },
  },
  {
    name: 'sbd_brief',
    description:
      "The latest morning brief from Ignacio, in full. It carries the day's priorities, what is " +
      'specifically not being asked for, and the questions he wants answered in tonight\'s EOD.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'How many briefs back. Default 1.' } },
    },
  },
  {
    name: 'sbd_post_eod',
    description:
      'File the end of day report. This is the record Ignacio reconciles the board against, so what ' +
      'goes here is what is believed to have happened. Anything under needs_ignacio becomes a ' +
      'decision on his board rather than a line he might miss.',
    inputSchema: {
      type: 'object',
      properties: {
        completed: {
          type: 'string',
          description: 'What was finished today, and for each one how it can be checked.',
        },
        qa: { type: 'string', description: 'What was verified today, and how.' },
        still_working: {
          type: 'array',
          description: 'Work in flight. Each entry carries what it is and when it is expected live.',
          items: {
            type: 'object',
            properties: {
              what: { type: 'string' },
              expected: { type: 'string', description: 'Expected live date, YYYY-MM-DD, or a range with its reason.' },
            },
            required: ['what'],
          },
        },
        needs_ignacio: {
          type: 'string',
          description: 'What is blocked on a decision from Ignacio. Leave empty if nothing is.',
        },
        date: { type: 'string', description: 'Report date as YYYY-MM-DD. Defaults to today.' },
        author: { type: 'string', description: 'Who is filing it. Defaults to SBD_WHO.' },
      },
      required: ['completed'],
    },
  },
  {
    name: 'sbd_post_release',
    description:
      'Record a release: what went out, how it was verified, and which tracker items it covers.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'One line on what shipped.' },
        detail: { type: 'string', description: 'What changed, in more depth.' },
        verification: { type: 'string', description: 'How it was checked against the running system.' },
        item_numbers: {
          type: 'array',
          items: { type: 'number' },
          description: 'Tracker item numbers this release covers.',
        },
        outcome: { type: 'string', description: 'Defaults to "shipped".' },
        date: { type: 'string', description: 'Release date as YYYY-MM-DD. Defaults to today.' },
      },
      required: ['summary'],
    },
  },
  {
    name: 'sbd_tracker_synced',
    description:
      'Record that the sprint tracker spreadsheet has been brought up to date. Clears the ' +
      '"needs updating" line on the build page. Only call this after the sheet has actually been updated.',
    inputSchema: {
      type: 'object',
      properties: { who: { type: 'string', description: 'Who updated it. Defaults to SBD_WHO.' } },
    },
  },
];

/* --------------------------------------------------------------- handlers */

const whoOr = (a) => (a && a.who) || WHO || 'Dev team';

async function handle(name, a = {}) {
  switch (name) {
    case 'sbd_status': {
      const [items, dec, eod, mark, briefs] = await Promise.all([
        query(`tracker_items?select=${ITEM_COLS}&order=number.asc`),
        query(`decisions?select=${DEC_COLS}&order=answered_on.desc.nullslast`),
        query('eod_reports?select=report_date,author&order=report_date.desc&limit=1'),
        query('ops_marks?select=key,at,by&key=eq.tracker_synced'),
        query('briefs?select=brief_date&order=brief_date.desc&limit=1'),
      ]);
      const open = openItems(items);
      const overdue = open.filter((t) => { const d = agreed(t); return d && days(d) < 0; });
      const pending = open.filter((t) => t.date_state === 'pending');
      const quiet = open.filter((t) => t.updated_at && days(String(t.updated_at).slice(0, 10)) <= -10);
      const decided = dec.filter((d) => d.status !== 'open' && String(d.answer || '').trim());
      const unread = decided.filter((d) => !d.seen_at);
      const synced = mark && mark[0] ? String(mark[0].at).slice(0, 10) : null;
      const movedSince = mark && mark[0]
        ? items.filter((t) => t.updated_at && t.updated_at > mark[0].at).length
        : items.length;
      // the most recent weekday before today; on a Monday that is Friday
      const d0 = new Date(`${today()}T12:00:00`);
      do { d0.setDate(d0.getDate() - 1); } while (d0.getDay() === 0 || d0.getDay() === 6);
      const eodDue = d0.toISOString().slice(0, 10);
      const lastEod = eod && eod[0] ? eod[0].report_date : null;

      const needs = [];
      if (!synced || synced < eodDue || movedSince)
        needs.push(`Sprint tracker spreadsheet needs updating. Last marked updated ${synced || 'never'}${movedSince ? `, ${movedSince} items changed since` : ''}.`);
      if (overdue.length)
        needs.push(`${overdue.length} item(s) past their agreed date. Mark done or send a new date.`);
      if (pending.length)
        needs.push(`${pending.length} proposed date(s) waiting on you.`);
      if (!lastEod || lastEod < eodDue)
        needs.push(`No end of day report since ${lastEod || 'ever'}. The last one due was ${eodDue}.`);
      if (quiet.length)
        needs.push(`${quiet.length} item(s) have not moved in ten days.`);
      if (unread.length)
        needs.push(`${unread.length} of Ignacio's answers are unread.`);

      return ok({
        needs_updating: needs,
        all_current: needs.length === 0,
        counts: {
          open: open.length,
          overdue: overdue.length,
          dates_to_answer: pending.length,
          unread_answers: unread.length,
          untouched_ten_days: quiet.length,
        },
        overdue_items: overdue.map(shapeItem),
        dates_to_answer: pending.map(shapeItem),
        unread_answer_refs: unread.map((d) => d.ref),
        last_eod: lastEod,
        eod_due_for: eodDue,
        tracker_last_synced: synced,
        latest_brief: briefs && briefs[0] ? briefs[0].brief_date : null,
      });
    }

    case 'sbd_queue': {
      const rows = openItems(await query(`tracker_items?select=${ITEM_COLS}&order=number.asc`));
      const ranked = [...rows].sort((x, y) => {
        if ((x.rank == null) !== (y.rank == null)) return x.rank == null ? 1 : -1;
        if (x.rank != null && y.rank != null && x.rank !== y.rank) return x.rank - y.rank;
        const dx = agreed(x), dy = agreed(y);
        if (!!dx !== !!dy) return dx ? -1 : 1;
        if (dx && dy && dx !== dy) return dx < dy ? -1 : 1;
        const p = { critical: 0, high: 1, medium: 2, low: 3 };
        return (p[x.priority] ?? 9) - (p[y.priority] ?? 9) || x.number - y.number;
      });
      const out = a.overdue_only ? ranked.filter((t) => shapeItem(t).overdue) : ranked;
      return ok(out.slice(0, a.limit || 50).map(shapeItem));
    }

    case 'sbd_item': {
      const rows = await query(`tracker_items?select=${ITEM_COLS}&number=eq.${Number(a.number)}`);
      if (!rows.length) throw new Error(`No tracker item numbered ${a.number}.`);
      return ok(shapeItem(rows[0]));
    }

    case 'sbd_dates_to_answer': {
      const rows = openItems(await query(`tracker_items?select=${ITEM_COLS}&order=number.asc`));
      return ok(rows.filter((t) => t.date_state === 'pending').map(shapeItem));
    }

    case 'sbd_confirm_date':
      return ok(await rpc('answer_date', {
        p_number: Number(a.number), p_action: 'confirm', p_who: whoOr(a),
      }));

    case 'sbd_counter_date':
      return ok(await rpc('answer_date', {
        p_number: Number(a.number), p_action: 'counter',
        p_new_date: a.date, p_reason: a.reason, p_who: whoOr(a),
      }));

    case 'sbd_mark_done':
      return ok(await rpc('mark_done', {
        p_number: Number(a.number), p_evidence: a.evidence, p_who: whoOr(a),
      }));

    case 'sbd_ask_ignacio':
      return ok(await rpc('ask_answer', {
        p_number: Number(a.number), p_question: a.question, p_who: whoOr(a),
      }));

    case 'sbd_answers': {
      const dec = await query(`decisions?select=${DEC_COLS}&order=answered_on.desc.nullslast,ref.desc`);
      const decided = dec.filter((d) => d.status !== 'open' && String(d.answer || '').trim());
      const list = a.unread_only ? decided.filter((d) => !d.seen_at) : decided;
      const items = await query('tracker_items?select=number,origin,status,proposed_on,counter_on,date_state');
      return ok(list.map((d) => {
        const linked = items.find((t) => t.origin === d.ref);
        return {
          ref: d.ref,
          question: d.question,
          answer: d.answer,
          reasoning: d.reasoning || null,
          verdict: d.verdict || null,
          status: d.status,
          answered_on: d.answered_on,
          context: d.note || null,
          read: !!d.seen_at,
          read_by: d.seen_by === 'carryover' ? null : d.seen_by || null,
          predates_the_answers_tab: d.seen_by === 'carryover',
          scheduled_as: linked
            ? { number: linked.number, date: agreed(linked), date_state: linked.date_state }
            : null,
        };
      }));
    }

    case 'sbd_got_it':
      return ok(await rpc('ack_decision', { p_ref: a.ref, p_who: whoOr(a) }));

    case 'sbd_not_clear':
      return ok(await rpc('follow_up_decision', {
        p_ref: a.ref, p_question: a.question, p_who: whoOr(a),
      }));

    case 'sbd_propose_from_answer':
      return ok(await rpc('propose_from_decision', {
        p_ref: a.ref, p_what: a.title, p_date: a.date,
        p_who: whoOr(a), p_why: a.reason || null, p_priority: a.priority || 'medium',
      }));

    case 'sbd_brief': {
      const rows = await query(
        `briefs?select=brief_date,author,body&order=brief_date.desc&limit=${Number(a.limit) || 1}`,
      );
      if (!rows.length) return text('No brief has been sent yet.');
      return ok(rows);
    }

    case 'sbd_post_eod':
      return ok(await rpc('post_eod', {
        p_date: a.date || today(),
        p_author: a.author || WHO || 'Dev team',
        p_completed: a.completed,
        p_qa: a.qa || null,
        p_still_working: a.still_working || null,
        p_needs_ignacio: a.needs_ignacio || null,
      }));

    case 'sbd_post_release':
      return ok(await rpc('post_release', {
        p_date: a.date || today(),
        p_outcome: a.outcome || 'shipped',
        p_summary: a.summary,
        p_detail: a.detail || null,
        p_verification: a.verification || null,
        p_item_numbers: a.item_numbers || null,
      }));

    case 'sbd_tracker_synced':
      return ok(await rpc('mark_tracker_synced', { p_who: whoOr(a) }));

    default:
      throw new Error(`Unknown tool ${name}.`);
  }
}

/* ----------------------------------------------------------------- server */

const server = new Server(
  { name: 'sbdops-build', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    return await handle(req.params.name, req.params.arguments || {});
  } catch (e) {
    // Hand the model the actual message. The database writes these for people.
    return { content: [{ type: 'text', text: `Could not do that: ${e.message}` }], isError: true };
  }
});

await server.connect(new StdioServerTransport());
