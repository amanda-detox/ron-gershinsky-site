/* Balancify (באלאנסיפיי) content. Edit freely.
   - APP_NAME: the app's name in one place (also update manifest.json + index.html <title>/apple title if renamed).
   - lists: each entry = one button on the home screen, in order. To add a button, add an object.
     items: [] (empty) shows "יצורף בקרוב" / "Coming soon".
     tag (optional): small label under the list title, shown as written.
     style: "info" lists use sections: [{ title, items }] and per-item info (explanation panel).
     item.detail (optional): { he, en } smaller second line under the item.
   - backgrounds: the design picker. file = bg/<id>.webp, thumb = bg/<id>-t.webp. */
var BAL_SOON = { he: "ההסבר יצורף בקרוב", en: "Explanation coming soon" }; // placeholder explanation
window.BAL_DATA = {
  APP_NAME: { he: "באלאנסיפיי", en: "Balancify" },
  subtitle: {
    he: "אפליקציה להרגעה, איזון וזרימה, במיוחד למתמודדים עם קושי נפשי ו/או פיזי רב.",
    en: "An app for calm, balance and flow, especially for those coping with significant emotional and/or physical difficulty."
  },
  instruction: {
    he: "בחר אחת או כמה מההנחיות הבאות על מנת לסייע לעצמך להגיע למצב של רוגע, זרימה, שלווה ואיזון.",
    en: "Choose one or more of the following guidelines to help yourself reach a state of calm, flow, serenity and balance."
  },
  lists: [
    {
      id: "wellness", icon: "🌿", style: "info",
      title: { he: "מעוניין באפשרויות להורדת סטרס והעלאת רמת וולנס אינטגרלית", en: "Interested in options to lower stress and raise integral wellness" },
      note: { he: "המידע כאן אינו ייעוץ רפואי", en: "This is not medical advice" },
      more: { he: "עוד יתווסף בקרוב", en: "More coming soon" },
      /* Explanations: info = { he, en }. draft: true = a short neutral draft written by Amanda,
         Ron can replace the text and delete "draft: true". links (optional) = [{ he, en, href }]. */
      sections: [
        { title: { he: "טיהור ודיטוקס", en: "Purification & detox" }, items: [
          { he: "טיהור אוויר", en: "Air purification", draft: true,
            info: { he: "ניקוי האוויר בבית מאבק, מזהמים ואלרגנים, למשל באמצעות מטהר אוויר עם מסנן HEPA או אוורור.", en: "Cleaning indoor air of dust, pollutants and allergens, for example with a HEPA air purifier or ventilation." } },
          { he: "טיהור מים", en: "Water purification", draft: true,
            info: { he: "סינון מי השתייה בבית, למשל במסנן פחם פעיל, במערכת אוסמוזה הפוכה או במתקן מים עם מסנן.", en: "Filtering drinking water at home, for example with an activated carbon filter, a reverse osmosis system or a filtered water dispenser." } },
          { he: "טיהור תזונה", en: "Nutrition purification", info: BAL_SOON },
          { he: "טיהור סביבה חיצונית", en: "External environment purification", info: BAL_SOON },
          { he: "דיטוקס חלבונים זרים", en: "Foreign proteins detox", info: BAL_SOON },
          { he: "דיטוקס פרסיטים", en: "Parasite detox", info: BAL_SOON },
          { he: "דיטוקס מתכות כבדות", en: "Heavy metals detox", info: BAL_SOON },
          { he: "דיטוקס פלואוריד", en: "Fluoride detox", info: BAL_SOON },
          { he: "דיטוקס פלסטיק ומיקרופלסטיקים", en: "Plastic and microplastics detox", info: BAL_SOON },
          { he: "גמילה מהתמכרויות (כולל סמים, סיגריות ווייפים)", en: "Quitting addictions (including drugs, cigarettes and vapes)", draft: true,
            info: { he: "בישראל יש קווי סיוע חינמיים: המוקד הלאומי לגמילה מעישון של משרד הבריאות, 6800* (א׳–ה׳, 8:00–20:00, ללא צורך בהפניה), והקו החם לטיפול בהתמכרויות של האגודה לבריאות הציבור, 6271*, לסמים, אלכוהול ועוד. גם קופות החולים מפעילות סדנאות גמילה מעישון.",
                    en: "Free help lines in Israel: the Ministry of Health national quit-smoking line, *6800 (Sun–Thu, 8:00–20:00, no referral needed), and the Israel Public Health Association addiction hotline, *6271, for drugs, alcohol and more. The HMOs also run quit-smoking workshops." },
            links: [
              { he: "חיוג 6800*", en: "Call *6800", href: "tel:*6800" },
              { he: "חיוג 6271*", en: "Call *6271", href: "tel:*6271" },
              { he: "משרד הבריאות: גמילה מעישון", en: "Ministry of Health: quitting smoking", href: "https://efsharibari.health.gov.il/well-being/smoking-prevention/call-center/" },
              { he: "האגודה לבריאות הציבור: הקו החם", en: "Public Health Association: hotline", href: "https://www.aguda.co.il/services/%D7%A7%D7%95-%D7%97%D7%9D-%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%9C-%D7%91%D7%94%D7%AA%D7%9E%D7%9B%D7%A8%D7%95%D7%99%D7%95%D7%AA/" }
            ] }
        ] },
        { title: { he: "בדיקות", en: "Tests" }, items: [
          { he: "בדיקה גנטית", en: "Genetic test", draft: true,
            info: { he: "בדיקה שמנתחת את ה-DNA מתוך דגימת רוק או דם. יש בדיקות שמזמינים דרך רופא, ויש כאלה שנמכרות ישירות לצרכן.", en: "A test that analyzes DNA from a saliva or blood sample. Some are ordered through a doctor, others are sold directly to consumers." } },
          { he: "בדיקת מעיים Viome", en: "Viome gut test", draft: true,
            info: { he: "Viome היא חברה אמריקאית שמוכרת ערכת בדיקה ביתית: שולחים דגימת צואה, והחברה מנתחת את החיידקים במעיים ומחזירה דוח עם המלצות תזונה.", en: "Viome is a US company that sells an at-home test kit: you send a stool sample, and the company analyzes your gut microbes and returns a report with food recommendations." },
            links: [{ he: "viome.com", en: "viome.com", href: "https://www.viome.com/" }] },
          { he: "בדיקת דם קומפריהנסיבית", en: "Comprehensive blood test", draft: true,
            info: { he: "בדיקת דם רחבה שבודקת מדדים רבים בבת אחת, כמו ספירת דם, כימיה, ויטמינים והורמונים. אפשר לבקש אותה מרופא המשפחה או לעשות אותה במעבדה פרטית.", en: "A broad blood panel that checks many markers at once, such as blood count, chemistry, vitamins and hormones. It can be requested from a family doctor or done at a private lab." } }
        ] },
        { title: { he: "מרכזים וסדנאות", en: "Centers & workshops" }, items: [
          { he: "מרכז וולנס של גארי בראקה (Gary Brecka)", en: "Gary Brecka's wellness center", draft: true,
            info: { he: "גארי בראקה מציג את עצמו כביולוג אנושי וביו-האקר (הוא אינו רופא). הוא היה שותף מייסד של רשת מרכזי הוולנס 10X Health עד 2024, וכיום עומד בראש The Ultimate Human, מותג וולנס עם פודקאסט, בדיקות גנטיות ואימון.", en: "Gary Brecka describes himself as a human biologist and biohacker (he is not a medical doctor). He co-founded the 10X Health wellness centers until 2024 and now leads The Ultimate Human, a wellness brand with a podcast, genetic testing and coaching." },
            links: [{ he: "theultimatehuman.com", en: "theultimatehuman.com", href: "https://www.theultimatehuman.com/" }] },
          { he: "סדנאות של ג'ו דיספנזה (Joe Dispenza)", en: "Joe Dispenza workshops", draft: true,
            info: { he: "ד\"ר ג'ו דיספנזה הוא כירופרקט וסופר אמריקאי (בין ספריו: Breaking the Habit of Being Yourself), שמעביר סדנאות מדיטציה ברחבי העולם וגם קורסים מקוונים.", en: "Dr. Joe Dispenza is an American chiropractor and author (books include Breaking the Habit of Being Yourself) who runs meditation workshops around the world and online courses." },
            links: [{ he: "drjoedispenza.com", en: "drjoedispenza.com", href: "https://drjoedispenza.com/" }] }
        ] },
        { title: { he: "טכנולוגיות לבית", en: "Home technologies" }, items: [
          { he: "סאונה אינפרא אדום", en: "Infrared sauna", draft: true,
            info: { he: "סאונה שמחממת את הגוף באמצעות פאנלים של קרינה אינפרא-אדומה, בטמפרטורת אוויר נמוכה יותר מסאונה רגילה. יש דגמים ביתיים.", en: "A sauna that warms the body with infrared panels, at a lower air temperature than a traditional sauna. Home models are available." } },
          { he: "תרפיית אור", en: "Light therapy", draft: true,
            info: { he: "חשיפה לאור באורכי גל מסוימים, למשל אור אדום או אינפרא-אדום קרוב, באמצעות פאנל או מנורה ייעודיים.", en: "Exposure to specific wavelengths of light, such as red or near-infrared, using a dedicated panel or lamp." } },
          { he: "אמבטיית קרח ייעודית", en: "Dedicated ice bath", draft: true,
            info: { he: "אמבט או מיכל שמקרר את המים לטמפרטורה נמוכה, לרוב בעזרת צ'ילר, לטבילה במים קרים בבית.", en: "A tub or tank that keeps water cold, usually with a chiller, for cold-water immersion at home." } },
          { he: "תא חמצן HBOT", en: "HBOT oxygen chamber", draft: true,
            info: { he: "HBOT (Hyperbaric Oxygen Therapy): נשימת חמצן בתוך תא שהלחץ בו גבוה מלחץ האוויר הרגיל. ניתן במרכזים ייעודיים, ויש גם תאים רכים לבית בלחץ נמוך יותר.", en: "HBOT (Hyperbaric Oxygen Therapy): breathing oxygen inside a chamber pressurized above normal air pressure. Offered at dedicated centers; softer home chambers with lower pressure also exist." } },
          { he: "מסכת חמצן עם אופניים ביתיים", en: "Oxygen mask with a home exercise bike", draft: true,
            info: { he: "אימון על אופני כושר ביתיים תוך נשימה ממסכה שמחוברת למחולל חמצן או למאגר חמצן. השיטה מכונה לפעמים EWOT.", en: "Riding a home exercise bike while breathing from a mask connected to an oxygen concentrator or reservoir. Sometimes called EWOT." } }
        ] }
      ]
    },
    {
      id: "stress", icon: "🌊",
      title: { he: "רמת סטרס גבוהה?", en: "High stress level?" },
      items: [
        { he: "תנועה", en: "Movement",
          detail: { he: "30 קפיצות במקום, סיבובי זרועות רפויות סביב הגוף (תרגיל טאי צ'י)", en: "30 jumps in place, loose arm swings around the body (Tai Chi arm-swing exercise)" } },
        { he: "קול", en: "Voice",
          detail: { he: "לזמזם, לעשות קולות אנחה או צעקה בסביבה בטוחה, לצעוק אל תוך כרית וכו'", en: "Humming, sighing or shouting sounds in a safe place, shouting into a pillow, etc." } },
        { he: "מגע", en: "Touch",
          detail: { he: "לגעת בגוף בצורה נעימה או בכל אובייקט אחר, מגע סטטי או דינמי, על הלב, הבטן או הראש. תנועות של קאפינג מצוינות", en: "Pleasant touch on the body or any object, static or moving, on the heart, belly or head. Cupping movements are excellent." } },
        { he: "מקלחת", en: "Shower" },
        { he: "סיבוב למטה", en: "A short walk downstairs" },
        { he: "חיבוק כרית 3/3", en: "Hug a pillow 3/3" },
        { he: "כיבוי מסכים ל-30, 60, 90 דקות", en: "Screens off for 30, 60, 90 minutes" },
        { he: "ניקוי אף + משאף אף", en: "Nose cleaning + nasal inhaler" },
        { he: "קור (מאוורר + מזגן) + חושך", en: "Cold (fan + air conditioner) + darkness" },
        { he: "5 אוג'אי + 5555 בשכיבה 2/2", en: "5 Ujjayi breaths + 5555 lying down 2/2" },
        { he: "5 אוג'אי + 5555 בישיבה 2/2", en: "5 Ujjayi breaths + 5555 sitting 2/2" },
        { he: "הפסקת שתיה", en: "A drink break" },
        { he: "לבדוק: אנלומה וילומה", en: "To check: Anulom Vilom" },
        { he: "זיהוי צרכים", en: "Identifying needs" }
      ]
    },
    {
      id: "dissoc", icon: "🌙",
      title: { he: "ניתוק או דיסוציאציה?", en: "Disconnection or dissociation?" },
      items: [
        { he: "גלי דלתא ואפסילון", en: "Delta and Epsilon waves" },
        { he: "לאפשר לזה להיות", en: "Allow it to be" },
        { he: "זיהוי צרכים", en: "Identifying needs" },
        { he: "צעדים קטנים ובניית אמון הדרגתית", en: "Small steps and gradually building trust" }
      ]
    },
    {
      id: "chaos", icon: "🍵",
      title: { he: "בלאגן פנימי ואי נינוחות?", en: "Inner chaos and unease?" },
      items: [
        { he: "תה", en: "Tea" },
        { he: "שוקו", en: "Hot chocolate" },
        { he: "ניקוי אף + משאף אף", en: "Nose cleaning + nasal inhaler" },
        { he: "סיבוב מתחת לבניין או מסביב לבית", en: "A walk under the building or around the house" },
        { he: "זיהוי צרכים", en: "Identifying needs" },
        { he: "גלי אלפא", en: "Alpha waves" }
      ]
    }
  ],
  defaultBg: "sunset",
  backgrounds: [
    { id: "sunset",    he: "שקיעה",          en: "Sunset" },
    { id: "forest",    he: "יער",            en: "Forest" },
    { id: "mountains", he: "הרים",           en: "Mountains" },
    { id: "house",     he: "בית מוגן",       en: "Safe house" },
    { id: "sea",       he: "חוף ים",         en: "Beach" },
    { id: "lake",      he: "אגם",            en: "Lake" },
    { id: "meadow",    he: "אחו",            en: "Meadow" },
    { id: "stars",     he: "ליל כוכבים",     en: "Starry night" },
    { id: "waterfall", he: "מפל",            en: "Waterfall" },
    { id: "snow",      he: "בקתה בשלג",      en: "Snowy cabin" }
  ]
};
