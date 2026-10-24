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
  }
};
