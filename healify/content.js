/* =====================================================================
   Healify (היליפיי) · CONTENT FILE  ·  Edit only this file to add content.
   ---------------------------------------------------------------------
   Every list below is EMPTY on purpose. While a list is empty, the app
   shows "Ron's list is coming soon" in that spot.

   To add an item, put an object like this inside the [ ] brackets:

     {
       he:   { title: "שם בעברית", text: "תיאור קצר בעברית" },
       en:   { title: "English name", text: "Short English description" },
       link: "https://..."        // optional, leave "" for no link
     },

   Items show in the order you write them. If one language is left
   empty, the other language is shown instead.
   ===================================================================== */
window.HEALIFY_CONTENT = {

  /* B · Recommended tests */
  tests: {
    free: [          // Free & online
    ],
    home: [          // Order online to your home, do it yourself per the instructions
    ]
  },

  /* C · Investment in self-healing technologies */
  tech: {
    free: [          // Free
    ],
    low: [           // Low-cost
    ],
    premium: [       // Expensive & luxurious
    ]
  },

  /* D · Distinction by case */
  cases: {
    autoimmune: [    // If there is an autoimmune condition
    ],
    cancer: [        // If there is cancer
    ],
    mental: [        // If there is a mental illness
    ],
    combo: [         // If there is a combination (general, any combination)
    ]
  },

  /* D · Optional: content for one specific combination.
     The key is the case ids joined with "+" in this order:
     autoimmune, cancer, mental, other.  Examples:
       "autoimmune+mental": [ { he: {...}, en: {...}, link: "" } ],
       "autoimmune+cancer": [ ... ]                                     */
  combos: {
  },

  /* D · Ron's personal recommendations (המלצות אישיות של רון).
     The user ticks what they are dealing with, and the matching item opens.
     Each item: id, he/en { title, text }, links: [ { he, en, url } ].
     Leave text "" to show "Coming soon". */
  ronRecs: [
    {
      id: "cancer",
      he: { title: "סרטן", text: "מומלץ לשקול ניקוי טפילים טבעי ואיכותי, במקביל לטיפול הרפואי ובתיאום עם הרופא המטפל. אין כאן המלצה לעצור או להפסיק טיפול רפואי קונבנציונאלי – זה במקביל, ולא במקום.\n\nמומלץ להיוועץ גם ברופא פונקציונלי, ולא רק באונקולוג או ברופא המשפחה.\n\nרופאים עם גישה משלימה וטבעית: Dr. Bryan Ardis\n\nרופאים נוספים – יצורפו בקרוב" },
      en: { title: "Cancer", text: "Consider a quality natural parasite cleanse, alongside medical treatment and coordinated with your treating doctor. This is not a recommendation to stop or pause conventional medical treatment – it is alongside, not instead.\n\nIt is recommended to also consult a functional medicine doctor, not only an oncologist or family doctor.\n\nDoctors with a complementary, natural approach: Dr. Bryan Ardis\n\nMore doctors – coming soon" },
      links: [ { he: "האתר של ד״ר בריאן ארדיס", en: "Dr. Bryan Ardis's website", url: "https://thedrardisshow.com/" } ]
    },
    {
      id: "autoimmune",
      he: { title: "אוטואימיון", text: "רופאים פונקציונאליים (Functional Medicine Doctors) מהמובילים בעולם מתארים שלרוב אוטואימיון כלשהו הינו מצב בעייתי של המעיים שצריך לאזנו.\n\nחלק גדול מהאיזון הינו התזונה והדיאטה, ממליץ בחום להתנסות בדיאטת האריה של מיכאלה פיטרסון (Lion Diet), ישנן הרבה הצלחות לדיאטה זו.\n\nלגבי טיפול איכותי במערכת המעיים מומלץ להיוועץ ולעבור תהליך ייעוץ מתמשך עם רופא פונקציונלי, מומלץ לפנות לקליניקות כגון אלו של ד\"ר בריאן ארדיס וד\"ר גאנדרי." },
      en: { title: "Autoimmune", text: "Some of the world's leading functional medicine doctors describe that, in most cases, any autoimmune condition is a problematic state of the gut that needs to be balanced.\n\nA large part of that balance is nutrition and diet. I warmly recommend trying Mikhaila Peterson's Lion Diet; this diet has had many successes.\n\nFor quality care of the digestive system, it's recommended to consult and go through an ongoing advisory process with a functional medicine doctor, for example at clinics such as those of Dr. Bryan Ardis and Dr. Gundry." },
      links: []
    },
    {
      id: "bipolar",
      he: { title: "ביפולר (דו קוטבי)", text: "ישנן הצלחות גדולות עם אבחנה ספציפית זו על ידי טיפול תזונתי מטבולי, ואף מתחיל ענף חדש של פסיכיאטריה שנקרא פסיכיאטריה מטבולית.\n\nתזונה קטוגנית יכולה לעזור ואף לרפא. שימו לב לקרן באזוקי (Baszucki), שהוקמה על ידי הוריו של מתמודד עם ביפולר שחווה הצלחה עצומה בשיפור איכות חייו על ידי טיפולים פורצי דרך אלו." },
      en: { title: "Bipolar disorder", text: "There have been great successes with this specific diagnosis through metabolic nutritional treatment, and a new branch of psychiatry called metabolic psychiatry is even emerging.\n\nA ketogenic diet can help and even heal. Take note of the Baszucki foundation (Baszucki Group), founded by the parents of a young man living with bipolar disorder who experienced enormous success in improving his quality of life through these groundbreaking treatments." },
      links: [ { he: "קרן באזוקי: ביפולר ופסיכיאטריה מטבולית", en: "Baszucki Group: bipolar disorder & metabolic psychiatry", url: "https://baszuckigroup.com/our-work/metabolic-mental-health/bipolar-disorder/" } ]
    },
    {
      id: "depression",
      he: { title: "דיכאון", text: "ישנם כמה טיפולים איכותיים לדיכאון שמראים תוצאות מאוד חיוביות: טיפול בקטמין (בארץ יש את מכון סטלה בשביל זה ועוד קליניקות), ובחו\"ל לא חסר בכלל.\n\nקליניקות לטיפול בפטריות פסיכדליות גם הראו תוצאות מבטיחות. אין בארץ אך יש באירופה ובארה\"ב, חוקי, מוגן, עם צוות רפואי, ומקום יפה מסוגנן ומתאים לתהליך ריפוי שכזה.\n\nמומלץ להימנע ממטפלים עצמאיים וללכת למכון איכותי שכזה." },
      en: { title: "Depression", text: "There are several quality treatments for depression that show very positive results: ketamine treatment (in Israel there is the Stella institute for this, along with other clinics), and abroad there is no shortage at all.\n\nPsychedelic mushroom treatment clinics have also shown promising results. There are none in Israel, but there are in Europe and the US: legal, safe, with medical staff, and a beautiful, stylish place suited to a healing process like this.\n\nIt's recommended to avoid independent practitioners and to go to a quality institute like this." },
      links: [ { he: "קטמיינד, מרפאת הקטמין של סטלה ישראל", en: "KetaMind, Stella Israel's ketamine clinic", url: "https://ketamindclinic.com/" } ]
    },
    {
      id: "addiction",
      he: { title: "התמכרות", text: "הטיפול הכי טוב על פני כדור הארץ היום להתמכרות הינו טיפול באיבוגה, ולעיתים בשילוב עם בופו או המולקולה \u20665-MeO-DMT\u2069.\n\nישנם מכונים וקליניקות איכותיות במקסיקו שמקבלות לטיפול, והמון סיפורי הצלחה של גיבורי מלחמה מארה\"ב שהתמכרו ל\"תרופות\" כמו אוקסיקודון וכו׳.\n\nיש מכון נפלא הנקרא ביונד (Beond), שם כרגע עושים רק איבוגה או איבוגאין (המולקולה), ללא בופו או \u20665-MeO-DMT\u2069." },
      en: { title: "Addiction", text: "The best treatment on the planet today for addiction is iboga treatment, sometimes combined with Bufo or the molecule 5-MeO-DMT.\n\nThere are quality institutes and clinics in Mexico that accept patients, and many success stories of US war heroes who became addicted to \"medications\" like oxycodone, etc.\n\nThere is a wonderful institute called Beond, where they currently do only iboga or ibogaine (the molecule), without Bufo or 5-MeO-DMT." },
      links: [ { he: "ביונד (Beond)", en: "Beond", url: "https://beondibogaine.com/" } ]
    },
    {
      id: "psychmeds",
      he: { title: "התמכרות לכדורים פסיכיאטריים", text: "" },
      en: { title: "Psychiatric medication dependence", text: "" },
      links: []
    }
  ]
};
