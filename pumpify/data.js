/* Pumpify (פַּאמְפִּיפַיי) content. Edit freely; the app re-renders from this file.
   - sections: one block per entry, in order. To add a section, add an object.
     items: [] (empty) shows "יצורף בקרוב" / "Coming soon".
   - Text fields are { he, en }. Either language may be left out; the other is shown instead.
   - Item types (field "type"):
       youtube : { type: "youtube", url: "https://www.youtube.com/watch?v=XXXX" (or youtu.be/…, /shorts/…, or id: "XXXX"),
                   title: { he, en }, note: { he, en }, embed: true }   // embed:false shows a link card instead of a player
       link    : { type: "link", url: "https://…", title: { he, en }, note: { he, en } }
       quote   : { type: "quote", text: { he, en }, author: { he, en } }
       image   : { type: "image", src: "media/xxx.jpg" (file in pumpify/media/) or "https://…",
                   alt: { he, en }, caption: { he, en } }
       audio   : { type: "audio", src: "media/xxx.mp3" (or "https://…"), title: { he, en }, note: { he, en } }
   Example (copy into a section's items):
     { type: "quote", text: { he: "…", en: "…" }, author: { he: "…", en: "…" } } */
window.PUMP_DATA = {
  APP_NAME: { he: "פַּאמְפִּיפַיי", en: "Pumpify" },
  subtitle: { he: "מדיה מעוררת השראה", en: "Inspiring media" },
  sections: [
    { id: "videos", icon: "🎬", color: "#ff8a3d", title: { he: "סרטונים", en: "Videos" }, items: [] },
    { id: "quotes", icon: "💬", color: "#ffd25a", title: { he: "ציטוטים", en: "Quotes" }, items: [] },
    { id: "images", icon: "🖼️", color: "#5aa9ff", title: { he: "תמונות", en: "Images" }, items: [] },
    { id: "audio",  icon: "🎧", color: "#b98bff", title: { he: "אודיו", en: "Audio" }, items: [] }
  ]
};
