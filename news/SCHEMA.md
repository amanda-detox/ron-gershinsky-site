# news.json schema (Updatify / עדכוניפיי)

The app (`index.html` + `app.js`) reads `news.json` from this folder on every open
(`news.json?t=<timestamp>`, `cache: no-store`; the service worker is network-first and keeps
one offline copy). A job that runs 3 times a day (morning, midday, evening) only has to overwrite `news.json` and upload it. No other file changes.

```json
{
  "version": 1,
  "updated": "2026-10-25T06:56:35+02:00",
  "topics": [
    { "id": "musk", "group": "person", "he": "אילון מאסק", "en": "Elon Musk" },
    { "id": "tesla", "group": "company", "he": "טסלה", "en": "Tesla" }
  ],
  "items": [
    {
      "id": "tesla-robotaxi-927",
      "topic": "tesla",
      "date": "2026-10-24T21:09:26Z",
      "url": "https://x.com/i/trending/2113431239780962741",
      "source": "X",
      "he": { "title": "…", "summary": "…" },
      "en": { "title": "…", "summary": "…" },
      "full_he": "הטקסט המלא…\n\n• שורה ברשימה\n• עוד שורה",
      "full_en": "The full text…\n\n• a list line\n• another line"
    }
  ]
}
```

## Fields
| Field | Required | Notes |
|---|---|---|
| `version` | yes | Always `1` for now. |
| `updated` | yes | ISO-8601 with offset. The time the file was generated, shown as "Last updated" in Asia/Jerusalem time. Older than 36 h shows an amber dot. |
| `topics[]` | yes | Display order of chips and groups. Keep all `person` topics together, then all `company` topics; a divider is drawn between groups. Topics with no items are hidden automatically, so keep the full list. |
| `topics[].id` | yes | Stable slug (the user's selected chip is remembered by id). |
| `topics[].group` | yes | `"person"` or `"company"`. |
| `topics[].he` / `.en` | yes | Chip and section label. |
| `items[].id` | yes | Unique, stable slug. **Must stay stable across runs:** when a run includes a story that was already in the previous `news.json`, reuse its existing `id` exactly (don't regenerate it). The app's read tracking is keyed by `id` (localStorage `rg-news-read`), so a new id makes an already-read story show up again as unread. Only genuinely new stories get new ids. |
| `items[].topic` | yes | Must match a `topics[].id`. |
| `items[].date` | yes | ISO-8601 publish time of the source (post `created_at`, story `updated_at`, or article date). Shown as relative time ("3 hours ago"). Items are sorted newest first within each topic. |
| `items[].url` | yes | Real `https://` source link. Never invent one. |
| `items[].source` | no | Short source label, e.g. `"X"`, `"X · @tim_cook"`, `"ice"`. |
| `items[].he` / `.en` | yes | `{ "title", "summary" }`. The title is one line; the summary is 1–3 sentences. Hebrew must be natural Hebrew (not word-for-word), addressing the reader in the masculine where needed. If one language is missing, the app falls back to the other. |
| `items[].full_he` / `full_en` | yes | **The full content of the item, shown in the in-app reader when the reader taps „קרא עוד” / “Read more”, so he never has to open X (which asks to sign up) or another site.** Plain text, no HTML or Markdown: a blank line (`\n\n`) starts a new paragraph, a line starting with `• ` is a list item, and a line starting with `1. ` is a numbered step. Rules are below, under "Full content". If one language is missing, the app shows the other; if both are missing it shows the summary with a short note (so old items keep working), but a new run must always fill both. |

## Full content (`full_he` / `full_en`), required for every item
- **X posts: include the author's own thread continuation.** Many posts put the real content in the author's first
  replies (e.g. Gary Brecka's "11 things I do every morning" lists them in the images and in his own replies under the post).
  For every X item, fetch the conversation (`search_posts_all` with `conversation_id:<id> from:<author> is:reply`)
  and add **all of the author's own self-replies, in order**, after the main post text. A first post alone is never enough.
  Replies by other people are not part of the content.
- Use the long text (`note_tweet.text`) when there is one, never the truncated `text`.
- **Quoted posts:** add the full text of the quoted post (`referenced_tweets` of type `quoted`, `expansions=referenced_tweets.id`), labelled
  "הפוסט שהוא ציטט:" (male author) / "הפוסט שהיא ציטטה:" (female author) / "The quoted post:".
- **Images and carousels:** when the content is in the images (lists, slides, charts, screenshots of articles), transcribe what
  they say faithfully (download from `pbs.twimg.com` and read them).
- **Linked articles / podcast pages / news sites:** give a faithful, complete rendering of the linked page (key points as `• ` lines),
  including the article's own caveats. For X trending stories (`/i/trending/<id>`), use the story `hook` + `summary` from `search_news`.
- Video-only posts: give the post text and say "שאר הפוסט הוא סרטון, ולכן אין עוד טקסט להציג." / "The rest of the post is a video, so there's no more text to show."
- **Never invent anything.** If something can't be obtained (a deleted story, an item missing from the thread), say so briefly in the
  text itself (e.g. "The post says 11 things, but only 10 are named in the thread."), and if the full text isn't available at all, use the summary followed by a short note that the full text isn't available.
- Same rules as the summaries: Hebrew is natural (not word-for-word) and addresses the reader in the masculine; medical claims are
  reported as the person's claim, with a short neutral note when they contradict mainstream consensus; remove `t.co` links and hashtags.
- Carried-over items: copy `full_he` / `full_en` from the previous `news.json` together with the `id` (only regenerate if the source changed).

## Current topic ids
People: `musk`, `cook`, `huang`, `durov`, `johnson`, `brecka`, `dispenza`, `asprey`, `mikhaila`, `lipton`,
`ardis`, `mccullough`, `mercola`, `medicalmedium`, `refaeli`.
Companies/topics: `tesla`, `spacex`, `grok`, `grokbot`, `apple`, `kraken`, `starterstory`.

## Regeneration recipe (runs 3 times a day)
0. Read the current `news.json` first; keep the `id` of any story you carry over (see `items[].id`).
1. Window: the last ~48–72 h (it's fine to go up to 7 days for quiet topics; omit a topic if nothing real was found).
2. Sources (X first):
   - X `search_news` (`max_age_hours: 72`) for companies and big names (Tesla, SpaceX Starship, Grok xAI, Grok Bot, Apple, Kraken, Jensen Huang, Elon Musk). The story URL is `https://x.com/i/trending/<id>`.
   - X `get_users_posts` (`exclude: replies,retweets`, `start_time` = window start) for these account ids:
     thegarybrecka 1612243573449146369 · DrJoeDispenza 35870506 · daveasprey 17202007 ·
     MikhailaFuller 874904274 · P_McCulloughMD 1465347964252180493 · mercola 12524522 ·
     MedicalMedium 600920098 · bryan_johnson 17468569 · durov 16477634 · BarRefaeli 185260477 ·
     starter_story 922599123546705921 · tim_cook 1636590253 · krakenfx 1399148563 · elonmusk 44196397 ·
     DrBryanArdis 104636022 (rarely posts). The post URL is `https://x.com/<username>/status/<id>`.
   - WebSearch/WebFetch for people who are quiet on X (Bruce Lipton: his X account is suspended; Bar Refaeli: Israeli
     media such as mako/ice/ynet; Pavel Durov: his Telegram channel t.me/durov and news sites).
3. Pick 1–3 items per topic, skipping pure promos and duplicates. For each item, build `full_he` and `full_en` per "Full content"
   above: for X posts, pull the author's own self-replies in the thread (in order), the quoted post, and the text in the images. Medical claims are reported as the person's claim
   ("he says…"), never as advice; add a short neutral note when a claim contradicts mainstream consensus.
4. Write `news.json` (UTF-8, `ensure_ascii=False`), validate that every `topic` exists, every `url` starts with https,
   every item has non-empty `full_he` and `full_en`, and carried-over ids are unchanged,
   then upload only `news.json` to `news/` in the repo.
