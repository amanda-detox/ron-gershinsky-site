/* Nine original wake-up sounds, synthesized with Web Audio (no files, nothing downloaded). */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AlarmSounds = factory();
})(this, function () {
  "use strict";
  // one note: oscillator(s) with a quick attack and exponential decay
  function tone(c, o) {
    var s = o.at, g = c.createGain(), peak = o.vol || 0.3, dur = o.dur || 0.5;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(peak, s + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
    g.connect(c.destination);
    (o.partials || [[1, 1]]).forEach(function (p) {
      var osc = c.createOscillator(), pg = c.createGain();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.f * p[0], s);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to * p[0], s + (o.glide || dur));
      pg.gain.value = p[1];
      osc.connect(pg); pg.connect(g); osc.start(s); osc.stop(s + dur + 0.05);
    });
  }
  var LIST = [
    { id: "chime", he: "צלצול רך", en: "Soft chimes", every: 1600, play: function (c, t) {
      [880, 1108.73, 1318.51].forEach(function (f, i) { tone(c, { at: t + i * 0.18, f: f, vol: 0.35, attack: 0.02, dur: 0.7 }); });
    } },
    { id: "classic", he: "צפצוף קלאסי", en: "Classic beep", every: 1000, play: function (c, t) {
      for (var i = 0; i < 4; i++) tone(c, { at: t + i * 0.16, f: 1000, type: "square", vol: 0.12, attack: 0.005, dur: 0.09 });
    } },
    { id: "rising", he: "צליל עולה", en: "Rising tone", every: 1800, play: function (c, t) {
      tone(c, { at: t, f: 330, to: 1320, glide: 1.2, vol: 0.28, attack: 0.15, dur: 1.4 });
    } },
    { id: "bell", he: "פעמון", en: "Bell", every: 2400, play: function (c, t) {
      tone(c, { at: t, f: 523.25, vol: 0.32, attack: 0.005, dur: 2.2, partials: [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]] });
    } },
    { id: "digital", he: "פולס דיגיטלי", en: "Digital pulse", every: 1200, play: function (c, t) {
      [0, 0.09, 0.18, 0.27, 0.5, 0.59, 0.68, 0.77].forEach(function (d) { tone(c, { at: t + d, f: 2093, type: "square", vol: 0.08, attack: 0.003, dur: 0.05 }); });
    } },
    { id: "birds", he: "ציוץ ציפורים", en: "Bird trill", every: 1700, play: function (c, t) {
      [0, 0.12, 0.24, 0.62, 0.72, 0.82, 0.92].forEach(function (d, i) {
        var f = i < 3 ? 2600 : 3200;
        tone(c, { at: t + d, f: f, to: f * 1.45, glide: 0.07, vol: 0.18, attack: 0.008, dur: 0.09 });
      });
    } },
    { id: "marimba", he: "מרימבה", en: "Marimba", every: 1600, play: function (c, t) {
      [523.25, 659.25, 783.99, 1046.5, 783.99].forEach(function (f, i) {
        tone(c, { at: t + i * 0.17, f: f, vol: 0.32, attack: 0.004, dur: 0.35, partials: [[1, 1], [4, 0.18]] });
      });
    } },
    { id: "gong", he: "גונג", en: "Gong", every: 3200, play: function (c, t) {
      tone(c, { at: t, f: 98, vol: 0.45, attack: 0.03, dur: 3, partials: [[1, 1], [1.48, 0.5], [2.03, 0.35], [2.94, 0.2], [4.1, 0.1]] });
    } },
    { id: "piano", he: "פסנתר עדין", en: "Gentle piano", every: 2600, play: function (c, t) {
      [[392, 0], [493.88, 0.3], [587.33, 0.6], [783.99, 0.9], [587.33, 1.35]].forEach(function (n) {
        tone(c, { at: t + n[1], f: n[0], type: "triangle", vol: 0.26, attack: 0.006, dur: 1.1, partials: [[1, 1], [2, 0.25]] });
      });
    } }
  ];
  var DEFAULT = "chime";
  function get(id) { for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i]; return LIST[0]; }
  function play(c, id) { if (c) get(id).play(c, c.currentTime + 0.02); }
  return { LIST: LIST, DEFAULT: DEFAULT, get: get, play: play };
});
