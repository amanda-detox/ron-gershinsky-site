/* The private apps, listed once for the home page's "My private apps" section (shown only to the site owner, see OWNER_IDS in ../index.html).
   Paths and icons are relative to this my/ folder. Add a new private app here and it shows up on the home page for the owner.
   hidden: true keeps an app off the list (its files stay); remove the flag to show it again. Clockify hidden 2026-10-28. */
window.RGMY_APPS = {
  title: { he: "האפליקציות הפרטיות שלי", en: "My private apps" },
  apps: [
    { href: "ideas/",    icon: "ideas/icon-192.png",    he: "ליסטיפיי",         en: "Listify",        heLine: "רשימות לפי קטגוריות", enLine: "Lists by category" },
    { href: "journal/",  icon: "journal/icon-192.png",  he: "יומןלי",           en: "Journalify",     heLine: "יומן אישי: פסקה ונושא, לפי יום או נושא", enLine: "A personal journal: a paragraph and a topic, by day or topic" },
    { href: "rehabify/", icon: "rehabify/icon-192.png", he: "ריהאביפיי",        en: "Rehabify",       heLine: "ספירת ימים נקיים וכלים לרגעי חשק", enLine: "Clean-day counter and tools for cravings" },
    { href: "calmify/",  icon: "calmify/icon-192.png",  he: "רוגעלי",           en: "Calmify",        heLine: "צ'ק-אין רגשי, נשימה וקרקוע", enLine: "Mood check-ins, breathing and grounding" },
    { href: "shopping/", icon: "shopping/icon-192.png?v=5", he: "קניותיפיי",      en: "Purchasify",  heLine: "מתעדכנת בזמן אמת בנייד ובלפטופ", enLine: "Updates live on phone and laptop" },
    { hidden: true, href: "clock/",    icon: "clock/icon-192.png",    he: "קלוקיפיי", en: "Clockify", heLine: "שעונים מעוררים עם רשימות משימות", enLine: "Alarms with task lists" }
  ]
};
