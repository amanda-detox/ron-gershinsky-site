/* ==========================================================================
   Monthly (חודשיפיי): ALL CONTENT LIVES HERE. Edit this file to change topics.
   --------------------------------------------------------------------------
   MONTHLY_DATA.awareness: the built-in awareness months (shown by default).
     Each month number (1 = January … 12 = December) has a list of items:
       { he: "Hebrew name", en: "English name",
         where: "us" | "intl"        (US observance / international),
         src:   "https://…"          (where it was verified, optional) }
   MONTHLY_DATA.tracks: topic tracks the user can tick (✓) to subscribe.
     Each track: { id: "unique-id" (never rename, it's saved on the phone),
                   color: "#hex",  icon: "emoji",
                   he / en: track name,
                   tag: { he, en } (optional shorter label for the small tag),
                   items: exactly 12 entries, January first, each { he, en } }
   To add a track: copy one block, give it a new id, colour and 12 items.
   Topic names only. No medical or financial advice text belongs here.
   ========================================================================== */
window.MONTHLY_DATA = {
  awareness: {
    1: [{ he: "חודש המודעות לבריאות צוואר הרחם", en: "Cervical Health Awareness Month", where: "us", src: "https://npin.cdc.gov/pages/annual-observances" }],
    2: [{ he: "חודש בריאות הלב", en: "American Heart Month", where: "us", src: "https://www.mycme.com/pages/health-awareness-calendar" }],
    3: [{ he: "חודש המודעות לפגיעות מוח", en: "Brain Injury Awareness Month", where: "us", src: "https://www.biausa.org/" }],
    4: [{ he: "חודש המודעות לאוטיזם (חודש הקבלה)", en: "Autism Acceptance Month", where: "us", src: "https://autismsociety.org/autism-acceptance-month/" },
        { he: "יום המודעות העולמי לאוטיזם (2 באפריל)", en: "World Autism Awareness Day (April 2)", where: "intl", src: "https://www.un.org/en/observances/autism-day" }],
    5: [{ he: "חודש המודעות לבריאות הנפש", en: "Mental Health Awareness Month", where: "us", src: "https://mhanational.org/mental-health-month" }],
    6: [{ he: "חודש בריאות הגבר", en: "Men's Health Month", where: "us", src: "https://www.menshealthmonth.org/" }],
    7: [{ he: "חודש הבטיחות מקרינת UV", en: "UV Safety Awareness Month", where: "us", src: "https://www.healthnet.com/content/dam/centene/healthnet/pdfs/broker/national/national-observances-calendar-flyer.pdf" }],
    8: [{ he: "חודש המודעות לחיסונים", en: "National Immunization Awareness Month", where: "us", src: "https://www.healthnet.com/content/dam/centene/healthnet/pdfs/broker/national/national-observances-calendar-flyer.pdf" }],
    9: [{ he: "חודש המודעות למניעת אובדנות", en: "Suicide Prevention Awareness Month", where: "us", src: "https://www.healthnet.com/content/dam/centene/healthnet/pdfs/broker/national/national-observances-calendar-flyer.pdf" },
        { he: "היום העולמי למניעת אובדנות (10 בספטמבר)", en: "World Suicide Prevention Day (Sept 10)", where: "intl", src: "https://www.who.int/campaigns/world-suicide-prevention-day" }],
    10: [{ he: "חודש הפיזיותרפיה", en: "National Physical Therapy Month", where: "us", src: "https://www.apta.org/national-physical-therapy-month" },
         { he: "חודש המודעות לסרטן השד", en: "Breast Cancer Awareness Month", where: "intl", src: "https://www.healthnet.com/content/dam/centene/healthnet/pdfs/broker/national/national-observances-calendar-flyer.pdf" }],
    11: [{ he: "חודש המודעות לסרטן הריאה", en: "Lung Cancer Awareness Month", where: "us", src: "https://www.aacr.org/patients-caregivers/awareness-months/" },
         { he: "חודש המודעות לסרטן הלבלב", en: "Pancreatic Cancer Awareness Month", where: "us", src: "https://www.aacr.org/patients-caregivers/awareness-months/" },
         { he: "מובמבר: בריאות הגבר וסרטן הערמונית והאשכים", en: "Movember: men's health, prostate & testicular cancer", where: "intl", src: "https://movember.com/" }],
    12: [{ he: "חודש הצעצועים והמתנות הבטוחים", en: "Safe Toys and Gifts Awareness Month", where: "us", src: "https://ohio.preventblindness.org/december-is-safe-toys-gifts-awareness-month/" }]
  },

  tracks: [
    { id: "mental", color: "#8b5cf6", icon: "🧠", he: "אבחנה בבריאות הנפש", en: "Mental-health diagnosis",
      items: [
        { he: "הפרעה רגשית עונתית (SAD)", en: "Seasonal affective disorder (SAD)" },
        { he: "הפרעות אכילה", en: "Eating disorders" },
        { he: "הפרעה דו-קוטבית", en: "Bipolar disorder" },
        { he: "הפרעת חרדה כללית", en: "Generalized anxiety disorder" },
        { he: "הפרעת אישיות גבולית", en: "Borderline personality disorder" },
        { he: "פוסט-טראומה (PTSD)", en: "Post-traumatic stress disorder (PTSD)" },
        { he: "סכיזופרניה", en: "Schizophrenia" },
        { he: "הפרעת פאניקה", en: "Panic disorder" },
        { he: "דיכאון מז'ורי", en: "Major depression" },
        { he: "הפרעת קשב וריכוז (ADHD)", en: "ADHD" },
        { he: "הפרעה טורדנית-כפייתית (OCD)", en: "Obsessive-compulsive disorder (OCD)" },
        { he: "חרדה חברתית", en: "Social anxiety disorder" }
      ] },
    { id: "substances", color: "#ef4444", icon: "💊", he: "מודעות לסמים וחומרים", en: "Drug & substance awareness",
      items: [
        { he: "אלכוהול (ינואר יבש)", en: "Alcohol (Dry January)" },
        { he: "ניקוטין ווייפים", en: "Nicotine & vaping" },
        { he: "קנאביס", en: "Cannabis" },
        { he: "פסיכדלים (LSD ופסילוסיבין)", en: "Psychedelics (LSD & psilocybin)" },
        { he: "אופיואידים ופנטניל", en: "Opioids & fentanyl" },
        { he: "קפאין", en: "Caffeine" },
        { he: "MDMA (אקסטזי)", en: "MDMA (ecstasy)" },
        { he: "קוקאין", en: "Cocaine" },
        { he: "בנזודיאזפינים", en: "Benzodiazepines" },
        { he: "אמפטמינים וממריצים", en: "Amphetamines & stimulants" },
        { he: "קנבינואידים סינתטיים („נייס גאי”)", en: "Synthetic cannabinoids (“spice”)" },
        { he: "קטמין", en: "Ketamine" }
      ] },
    { id: "webapp", color: "#06b6d4", icon: "💻", he: "בניית אפליקציית ווב", en: "Build a web app",
      items: [
        { he: "מעקב הרגלים", en: "Habit tracker" },
        { he: "תקציב אישי", en: "Personal budget app" },
        { he: "מתכונים ותכנון ארוחות", en: "Recipes & meal planner" },
        { he: "לוח משימות (קנבן)", en: "Task board (kanban)" },
        { he: "יומן ומצב רוח", en: "Journal & mood diary" },
        { he: "טיימר ריכוז (פומודורו)", en: "Focus timer (pomodoro)" },
        { he: "לוח מזג אוויר", en: "Weather dashboard" },
        { he: "צ'אט בזמן אמת", en: "Real-time chat" },
        { he: "כרטיסיות לימוד וחידונים", en: "Flashcards & quizzes" },
        { he: "אתר תדמית ותיק עבודות", en: "Portfolio / landing page" },
        { he: "חנות אונליין", en: "Online store" },
        { he: "משחק בדפדפן", en: "Browser game" }
      ] },
    { id: "invest", color: "#22c55e", icon: "📈", he: "סוג השקעה ומסחר", en: "Investing & trading type",
      items: [
        { he: "קרנות מחקות ותעודות סל (ETF)", en: "Index funds & ETFs" },
        { he: "מניות בודדות", en: "Individual stocks" },
        { he: "אג\"ח ממשלתיות וקונצרניות", en: "Government & corporate bonds" },
        { he: "השקעה בדיבידנדים", en: "Dividend investing" },
        { he: "נדל\"ן וקרנות ריט (REIT)", en: "Real estate & REITs" },
        { he: "סחורות וזהב", en: "Commodities & gold" },
        { he: "מט\"ח (פורקס)", en: "Forex" },
        { he: "אופציות", en: "Options" },
        { he: "חוזים עתידיים (פיוצ'רס)", en: "Futures" },
        { he: "מטבעות קריפטו", en: "Cryptocurrencies" },
        { he: "פנסיה וחיסכון לטווח ארוך", en: "Pension & long-term savings" },
        { he: "השקעות אנג'ל וסטארטאפים", en: "Angel investing & startups" }
      ] },
    { id: "logic", color: "#f59e0b", icon: "🧩", he: "לוגיקה והטיות חשיבה", en: "Logic & cognitive biases",
      items: [
        { he: "הטיית האישור", en: "Confirmation bias" },
        { he: "כשל העלות השקועה", en: "Sunk cost fallacy" },
        { he: "אפקט דאנינג-קרוגר", en: "Dunning–Kruger effect" },
        { he: "מתאם אינו סיבתיות", en: "Correlation vs. causation" },
        { he: "אפקט העיגון", en: "Anchoring effect" },
        { he: "היוריסטיקת הזמינות", en: "Availability heuristic" },
        { he: "הטיית השורדים", en: "Survivorship bias" },
        { he: "כשל איש הקש", en: "Straw man fallacy" },
        { he: "אד הומינם (התקפה אישית)", en: "Ad hominem" },
        { he: "התער של אוקאם", en: "Occam's razor" },
        { he: "כשל שיעור הבסיס", en: "Base rate fallacy" },
        { he: "הטיית החוכמה שבדיעבד", en: "Hindsight bias" }
      ] },
    { id: "theories", color: "#64748b", icon: "🛸", he: "תיאוריית קונספירציה מוכרת (להכיר, לא עובדה)", en: "Well-known conspiracy theory (to learn about, not fact)",
      tag: { he: "תיאוריית קונספירציה", en: "Conspiracy theory" },
      items: [
        { he: "הנחיתה על הירח", en: "Moon landing hoax claims" },
        { he: "השערת הזמן הפנטום", en: "Phantom time hypothesis" },
        { he: "אזור 51", en: "Area 51" },
        { he: "כדור הארץ השטוח", en: "Flat Earth" },
        { he: "האילומינטי", en: "The Illuminati" },
        { he: "שובלי כימיקלים (כמטריילס)", en: "Chemtrails" },
        { he: "תקרית רוזוול", en: "Roswell incident" },
        { he: "מות הנסיכה דיאנה", en: "Death of Princess Diana" },
        { he: "„פול מת” (הביטלס)", en: "“Paul is dead” (The Beatles)" },
        { he: "משולש ברמודה", en: "Bermuda Triangle" },
        { he: "רצח קנדי", en: "JFK assassination" },
        { he: "מי כתב את שייקספיר", en: "Shakespeare authorship question" }
      ] },
    { id: "drinks", color: "#d97706", icon: "🍵", he: "משקה החודש", en: "Drink of the month",
      items: [
        { he: "תה צמחים", en: "Herbal teas" },
        { he: "קקאו", en: "Cacao" },
        { he: "קומבוצ'ה", en: "Kombucha" },
        { he: "מאצ'ה", en: "Matcha" },
        { he: "לימונדה", en: "Lemonade" },
        { he: "קפה קולד ברו", en: "Cold brew coffee" },
        { he: "מי קוקוס", en: "Coconut water" },
        { he: "שייקים וסמות'יז", en: "Smoothies" },
        { he: "קפיר", en: "Kefir" },
        { he: "יין", en: "Wine" },
        { he: "יֶרבָּה מאטה", en: "Yerba mate" },
        { he: "צ'אי מסאלה", en: "Masala chai" }
      ] },
    { id: "ethics", color: "#ec4899", icon: "🤝", he: "אקטיביזם, אתיקה וחמלה", en: "Activism, ethics & compassion",
      items: [
        { he: "רווחת בעלי חיים", en: "Animal welfare" },
        { he: "חסד והתנדבות", en: "Kindness & volunteering" },
        { he: "זכויות נשים", en: "Women's rights" },
        { he: "סביבה ואקלים", en: "Environment & climate" },
        { he: "זכויות עובדים", en: "Workers' rights" },
        { he: "פליטים ומבקשי מקלט", en: "Refugees & asylum seekers" },
        { he: "אוקיינוסים ופלסטיק", en: "Oceans & plastic" },
        { he: "בזבוז מזון ורעב", en: "Food waste & hunger" },
        { he: "שלום ויישוב סכסוכים", en: "Peace & conflict resolution" },
        { he: "צמצום הסטיגמה סביב בריאות הנפש", en: "Ending mental-health stigma" },
        { he: "זכויות ילדים", en: "Children's rights" },
        { he: "זכויות אדם", en: "Human rights" }
      ] },
    { id: "biohack", color: "#14b8a6", icon: "🌿", he: "ביוהאקינג, וולנס וחיים טובים", en: "Biohacking, wellness & good living",
      items: [
        { he: "אופטימיזציה של שינה", en: "Sleep optimization" },
        { he: "חשיפה לקור", en: "Cold exposure" },
        { he: "תרגילי נשימה", en: "Breathwork" },
        { he: "צום לסירוגין", en: "Intermittent fasting" },
        { he: "אור בוקר ושעון ביולוגי", en: "Morning light & circadian rhythm" },
        { he: "בריאות המעי והמיקרוביום", en: "Gut health & microbiome" },
        { he: "שתייה ואלקטרוליטים", en: "Hydration & electrolytes" },
        { he: "דיטוקס דיגיטלי", en: "Digital detox" },
        { he: "אימוני כוח", en: "Strength training" },
        { he: "מדיטציה וקשיבות", en: "Meditation & mindfulness" },
        { he: "שונות קצב הלב (HRV)", en: "Heart rate variability (HRV)" },
        { he: "הכרת תודה וקשרים חברתיים", en: "Gratitude & social connection" }
      ] }
  ]
};
