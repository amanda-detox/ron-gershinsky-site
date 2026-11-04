# פלייפיי · Flyify

Live game: `fly/` — https://amanda-detox.github.io/ron-gershinsky-site/fly/

Sandbox: `fly-sandbox/` — https://amanda-detox.github.io/ron-gershinsky-site/fly-sandbox/

The sandbox is not linked from the home page. It is where the next version is tried.

## Workflow

1. Make the change in `fly-sandbox/` first. Keep its service-worker cache on the `rg-flysandbox-` prefix, and its manifest `id` on `/ron-gershinsky-site/fly-sandbox/`, so it does not replace the installed live app.
2. Play it on a phone, in portrait. Check that the character stays a normal size and that climb and dive level out when the stick is released.
3. Promote to live only after that check. Copy the tested files into `fly/`, then bump `CACHE` in `fly/sw.js` to the next `rg-fly-vN` and the `game.js?v=` query to the same number, so phones already running the installed app pick up the new version.

The live worker deletes every cache whose name starts with `rg-fly-`. The sandbox must not use that prefix. A sandbox update check must not delete `rg-fly-` caches either.

## Why live was rolled back (2026-11-04)

Live is the last good flight code — the continuous ribbon from PR #29 (`rg-fly-v22`) — published again as `rg-fly-v26`, then the jetpack ribbon was turned off in `rg-fly-v27`. The newer flight code is only in the sandbox.

The jetpack ribbon and aurora are still in `fly/trail.js`. `TRAIL_ENABLED` is `false`, so nothing is drawn and the center button stays hidden. Set that flag to `true` and bump the live cache to bring the trail back. `fly-sandbox/` does not use this flag.

PR #30 made the current sandbox unplayable on a phone:

- The chase camera no longer lags behind speed, so it sits about 4.4 units from the character instead of about 6.6. The character fills much more of the screen.
- Climb and dive integrate pitch and do not return to level when the stick is released. The model is rotated by that whole pitch (up to about 86°), so the body swings toward the camera and the flight path keeps climbing or diving.

Do not copy the sandbox over `fly/` until that is fixed and checked on a phone.
