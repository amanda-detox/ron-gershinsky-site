/* Diagnosify (דיאגנוסיפיי) content. Edit freely; the app re-renders from this file.
   - checksTitle: heading of the checks section.
   - checks: one card per entry, in order.
     url: https link. The title opens it in a new tab. No url: the title stays plain text
     and tapping the card opens its panel.
     content: null (or missing), and no url, shows "יצורף בקרוב" / "Coming soon".
   - Text fields are { he, en }. Either language may be left out; the other is shown instead. */
window.DIAG_DATA = {
  APP_NAME: { he: "דיאגנוסיפיי", en: "Diagnosify" },
  subtitle: { he: "10 בדיקות במקום אחד", en: "10 checks in one place" },
  intro: { he: "בדיקות סינון עצמיות חינמיות", en: "Free self-screening checks" },
  checksTitle: { he: "בדיקות ואישורים", en: "Tests and confirmations" },
  disclaimer: {
    he: "אין לראות בבדיקות כאן אבחנה רפואית. אלו בדיקות סינון בלבד, ומומלץ להיוועץ ברופא פונקציונלי.",
    en: "These checks are not a medical diagnosis. They are screening only; consult a functional medicine doctor."
  },
  checks: [
    { id: "cirs",      title: { he: "בדיקת סירס (CIRS, רעלנים ביולוגיים)", en: "CIRS (biotoxin illness)" }, url: "https://www.asymmetrichealth.com/biotoxin-screening-quiz/", content: null },
    { id: "pandas",    title: { he: "בדיקת פאנדאס", en: "PANS-PANDAS" }, url: "https://pansandpandas.scoreapp.com/", content: null },
    { id: "cfs",       title: { he: "בדיקת CFS (תשישות כרונית)", en: "ME/CFS" }, url: "https://solvecfs.org/me-cfs-long-covid/do-i-have-mecfs-quiz/", content: null },
    { id: "mcas",      title: { he: "בדיקת MCAS ורגישות להיסטמין", en: "MCAS & histamine sensitivity" }, url: "https://mastcell360.com/mystery-quiz/", content: null },
    { id: "metabolic", title: { he: "בדיקת סינדרום מטאבולי", en: "Metabolic syndrome" }, url: "https://gethealthycalculators.com/metabolic-syndrome-calculator/", content: null },
    { id: "leakygut",  title: { he: "בדיקת ליקי גאט", en: "Leaky gut" }, url: "https://drwillcole.com/leaky-gut-quiz", content: null },
    { id: "leakybrain",title: { he: "בדיקת ליקי בריין", en: "Leaky brain" }, content: null },
    { id: "strep",     title: { he: "בדיקת סטרפ / סטאפ", en: "Strep / Staph" }, content: null },
    { id: "candida",   title: { he: "בדיקת קנדידה", en: "Candida" }, content: null },
    { id: "autism",    title: { he: "בדיקת אוטיזם", en: "Autism" }, content: null }
  ]
};
