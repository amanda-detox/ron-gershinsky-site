"use strict";

/* Pages opened by the smoke tests.
   Paths are relative to the site root (no leading slash), so they stay
   under whatever base URL the workflow is pointed at.
   Dated backup folders are left out on purpose. */

const LIVE_SITE = "https://amanda-detox.github.io/ron-gershinsky-site/";

/** Sandboxes Ashley asked for first. Each one must show a sandbox label. */
const sandboxes = [
  { name: "Journal sandbox", path: "my/journal-sandbox/" },
  { name: "Balancify sandbox", path: "balancify-sandbox/" },
  { name: "Ideas sandbox", path: "ideas-sandbox/" },
  { name: "Shopping sandbox", path: "my/shopping-sandbox/" },
  { name: "Wealthify sandbox", path: "wealthify-sandbox/" },
];

/** The public home page. A light load check only. */
const home = { name: "Home", path: "index.html" };

/** Every other app front page, including the other sandboxes. */
const apps = [
  { name: "About", path: "about/" },
  { name: "Activify", path: "activist/" },
  { name: "Alarm", path: "alarm/" },
  { name: "Balancify", path: "balancify/" },
  { name: "Boredify", path: "boredify/" },
  { name: "Calcify", path: "calc/" },
  { name: "Clockify", path: "clockify/" },
  { name: "Clockify sandbox", path: "clockify-sandbox/" },
  { name: "Depornify", path: "depornify/" },
  { name: "Diagnosify", path: "diagnosify/" },
  { name: "Flyify", path: "fly/" },
  { name: "Flyify sandbox", path: "fly-sandbox/" },
  { name: "Healify", path: "healify/" },
  { name: "Healify sandbox", path: "healify-sandbox/" },
  { name: "Home sandbox", path: "home-sandbox/" },
  { name: "Imagify sandbox", path: "imagify-sandbox/" },
  { name: "Lightify", path: "game/" },
  { name: "Listify", path: "listify/" },
  { name: "Mazify", path: "mazify/" },
  { name: "Monthly", path: "monthly/" },
  { name: "Musicify sandbox", path: "musicify-sandbox/" },
  { name: "My hub", path: "my/" },
  { name: "My Calmify", path: "my/calmify/" },
  { name: "My Clockify", path: "my/clock/" },
  { name: "My Listify", path: "my/ideas/" },
  { name: "My Journal", path: "my/journal/" },
  { name: "My Rehabify", path: "my/rehabify/" },
  { name: "My Purchasify", path: "my/shopping/" },
  { name: "Mystify", path: "mystify/" },
  { name: "Mystify sandbox", path: "mystify-sandbox/" },
  { name: "Positify", path: "positify/" },
  { name: "Psychedelify", path: "psychedelify/" },
  { name: "Pumpify", path: "pumpify/" },
  { name: "Purchasify", path: "purchasify/" },
  { name: "Purchasify sandbox", path: "purchasify-sandbox/" },
  { name: "Rehabify", path: "rehabify/" },
  { name: "Relaxify", path: "relax/" },
  { name: "Rogali", path: "rogali/" },
  { name: "Shootify sandbox", path: "shootify-sandbox/" },
  { name: "Smokify", path: "smokify/" },
  { name: "Soundify", path: "sounds/" },
  { name: "Summarify", path: "summarify/" },
  { name: "Updatify", path: "news/" },
  { name: "Wealthify", path: "wealthify/" },
  { name: "Workify", path: "workify/" },
  { name: "Yomanli", path: "yomanli/" },
  { name: "Yomanli sandbox", path: "yomanli-sandbox/" },
  { name: "Youngify", path: "young/" },
];

module.exports = { LIVE_SITE, sandboxes, home, apps };
