# Browser checks for Ashley

These checks open the public site in Chrome and look at each page. They do two things: they make sure the page actually shows up, and they make sure the browser console has no errors. Each page is opened twice, once at phone size (390 by 844) and once at desktop size (1280 by 800).

They never sign in. They never type in a box, click Save, or add or delete anything. If a page tries to change this site or Appwrite while it is loading, the check blocks that request and fails. Nothing is written to Appwrite, and no live account is used. The Musicify page is a YouTube player. The player may contact YouTube on its own. The check does not press play, and it still blocks any change to this site.

The checks do not publish the site. GitHub Pages is left alone.

## How to run them from GitHub

1. Open this repository on GitHub.
2. Click the **Actions** tab.
3. In the left-hand list, click **Browser smoke tests**.
4. Click the **Run workflow** button.
5. Leave the web address as `https://amanda-detox.github.io/ron-gershinsky-site/` unless someone asked you to test a different copy of the site. Keep the slash at the end.
6. Click the green **Run workflow** button.
7. Open the run that appears at the top and wait for it to finish.

A green check means every page loaded with no console errors. A red X means at least one page did not. The same checks also start on their own when someone opens a pull request. That run uses the live site address above. It still does not publish anything.

## How to read the results

1. Open the finished run.
2. Scroll to **Artifacts** and download **browser-smoke-report**.
3. Unzip that file.
4. Open `playwright-report/index.html` in a browser.

Each row is one page at one screen size. The name says which page, and the project says `mobile` or `desktop`. Click a row to see a picture of the page. If the row is red, the same screen shows the error text (a console message, a script crash, or a page that did not load).

The pictures are also saved as PNG files inside the `test-results` folder in that zip, if you want to look at them without the report.

If `index.html` opens as a blank page, unzip the artifact, install the tools once with the commands below, and from the `tests` folder run:

```bash
npx playwright show-report /path/to/unzipped/playwright-report
```

## Pages that are checked

Sandbox pages (these must show a sandbox label):

- Journal sandbox — `my/journal-sandbox/`
- Balancify sandbox — `balancify-sandbox/`
- Ideas sandbox (Listify sandbox) — `ideas-sandbox/`
- Shopping sandbox — `my/shopping-sandbox/`
- Wealthify sandbox — `wealthify-sandbox/`

Home page (a light load check):

- Home — `index.html` on the live site

Every other app front page, including the other sandboxes (About, Activify, Alarm, Balancify, Boredify, Calcify, Clockify and its sandbox, Depornify, Diagnosify, Flyify and its sandbox, Healify and its sandbox, the home sandbox, Imagify sandbox, Lightify, Listify, Mazify, Monthly, Musicify sandbox, the private hub under `my/`, Calmify, the private clock, the private lists, the private journal, Rehabify and its private copy, the private shopping list, Mystify and its sandbox, Positify, Psychedelify, Pumpify, Purchasify and its sandbox, Relaxify, Rogali, Shootify sandbox, Smokify, Soundify, Summarify, Updatify, Wealthify, Workify, Yomanli and its sandbox, Youngify).

Old backup folders (`home-backup-2026-11-10/` and `my/ideas-backup-2026-11-10/`) are not opened.

## Run them on your own computer

From the `tests` folder:

```bash
npm ci
npx playwright install chromium
npm test
```

To point at a different copy of the site:

```bash
BASE_URL=https://amanda-detox.github.io/ron-gershinsky-site/ npm test
```

Then open the report with `npm run report`.
