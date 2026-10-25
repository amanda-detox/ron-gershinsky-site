# news.json schema (Updates / עדכונים)

The app (`index.html` + `app.js`) reads `news.json` from this folder on every open
(`news.json?t=<timestamp>`, `cache: no-store`; the service worker is network-first and keeps
one offline copy). A daily job only has to overwrite `news.json` and upload it. No other file changes.

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
      "en": { "title": "…", "summary": "…" }
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
| `items[].id` | yes | Unique, stable slug. |
| `items[].topic` | yes | Must match a `topics[].id`. |
| `items[].date` | yes | ISO-8601 publish time of the source (post `created_at`, story `updated_at`, or article date). Shown as relative time ("3 hours ago"). Items are sorted newest first within each topic. |
| `items[].url` | yes | Real `https://` source link. Never invent one. |
| `items[].source` | no | Short source label, e.g. `"X"`, `"X · @tim_cook"`, `"ice"`. |
| `items[].he` / `.en` | yes | `{ "title", "summary" }`. The title is one line; the summary is 1–3 sentences. Hebrew must be natural Hebrew (not word-for-word), addressing the reader in the masculine where needed. If one language is missing, the app falls back to the other. |

## Current topic ids
People: `musk`, `cook`, `huang`, `durov`, `johnson`, `brecka`, `dispenza`, `asprey`, `mikhaila`, `lipton`,
`ardis`, `mccullough`, `mercola`, `medicalmedium`, `refaeli`.
Companies/topics: `tesla`, `spacex`, `grok`, `grokbot`, `apple`, `kraken`, `starterstory`.

## Daily regeneration recipe
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
3. Pick 1–3 items per topic, skipping pure promos and duplicates. Medical claims are reported as the person's claim
   ("he says…"), never as advice; add a short neutral note when a claim contradicts mainstream consensus.
4. Write `news.json` (UTF-8, `ensure_ascii=False`), validate that every `topic` exists and every `url` starts with https,
   then upload only `news.json` to `news/` in the repo.
