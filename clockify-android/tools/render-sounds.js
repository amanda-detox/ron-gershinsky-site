/* Build alarm tones for the sideload APK from clockify-sandbox/sounds.js.
   The page synthesizes these with Web Audio. This script plays the same
   functions into a small stand-in for AudioContext and writes looping WAVs.
   Run: node clockify-android/tools/render-sounds.js */
"use strict";
var fs = require("fs");
var path = require("path");
var sounds = require("../../clockify-sandbox/sounds.js");

var SR = 44100;
var OUT = path.join(__dirname, "..", "app", "src", "main", "res", "raw");

function Gain() {
  this.events = [];
  this.gain = {
    value: 1,
    setValueAtTime: function (v, t) { this.events.push({ op: "set", v: v, t: t }); }.bind(this),
    exponentialRampToValueAtTime: function (v, t) { this.events.push({ op: "exp", v: v, t: t }); }.bind(this),
    linearRampToValueAtTime: function (v, t) { this.events.push({ op: "lin", v: v, t: t }); }.bind(this)
  };
  this.connect = function (dest) { this.dest = dest; };
}
function Osc() {
  this.type = "sine";
  this._freq = [];
  this.frequency = {
    value: 440,
    setValueAtTime: function (v, t) { this._freq.push({ op: "set", v: v, t: t }); }.bind(this),
    exponentialRampToValueAtTime: function (v, t) { this._freq.push({ op: "exp", v: v, t: t }); }.bind(this)
  };
  this.connect = function (dest) { this.dest = dest; };
  this.start = function (t) { this._start = t; };
  this.stop = function (t) { this._stop = t; };
}
function makeCtx() {
  return {
    currentTime: 0,
    destination: { dest: true },
    createGain: function () { return new Gain(); },
    createOscillator: function () { return new Osc(); }
  };
}
function valueAt(events, initial, t) {
  var hold = initial, holdT = -1, i;
  for (i = 0; i < events.length; i++) {
    var ev = events[i];
    if (ev.op === "set" && ev.t <= t) { hold = ev.v; holdT = ev.t; continue; }
    if ((ev.op === "exp" || ev.op === "lin") && ev.t > holdT) {
      if (t >= ev.t) { hold = ev.v; holdT = ev.t; continue; }
      var span = ev.t - holdT;
      var u = span <= 0 ? 1 : (t - holdT) / span;
      if (u <= 0) return hold;
      if (ev.op === "lin") return hold + (ev.v - hold) * u;
      var a = Math.max(Math.abs(hold), 1e-8), b = Math.max(Math.abs(ev.v), 1e-8);
      var sign = ev.v < 0 ? -1 : 1;
      return sign * (a * Math.pow(b / a, u));
    }
  }
  return hold;
}
function wave(type, phase) {
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === "triangle") {
    var u = (phase / (2 * Math.PI)) % 1;
    if (u < 0) u += 1;
    return u < 0.5 ? (4 * u - 1) : (3 - 4 * u);
  }
  return Math.sin(phase);
}
function collect(seconds, played) {
  var total = Math.max(1, Math.floor(SR * seconds));
  var buf = new Float64Array(total);
  played.forEach(function (osc) {
    var pg = osc.dest;
    var g = pg && pg.dest;
    if (!pg || !g) return;
    var start = Math.floor((osc._start || 0) * SR);
    var stop = Math.floor((osc._stop || seconds) * SR);
    var phase = 0;
    var amp = pg.gain && typeof pg.gain.value === "number" ? pg.gain.value : 1;
    for (var i = start; i < stop && i < total; i++) {
      var t = i / SR;
      var f = valueAt(osc._freq, osc.frequency.value || 440, t);
      phase += 2 * Math.PI * f / SR;
      var env = valueAt(g.events, 1, t);
      buf[i] += wave(osc.type || "sine", phase) * amp * env;
    }
  });
  var peak = 0;
  for (var n = 0; n < buf.length; n++) peak = Math.max(peak, Math.abs(buf[n]));
  var gain = peak > 0.00001 ? 0.9 / peak : 1;
  var out = new Int16Array(buf.length);
  for (var k = 0; k < buf.length; k++) {
    var x = Math.max(-1, Math.min(1, buf[k] * gain));
    out[k] = (x * 32767) | 0;
  }
  return { pcm: out, peak: peak };
}

function writeWav(file, pcm) {
  var n = pcm.length;
  var buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (var i = 0; i < n; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
  fs.writeFileSync(file, buf);
}

// Instrument the context by wrapping createOscillator so we keep every voice.
function playInto(sound) {
  var voices = [];
  var ctx = makeCtx();
  var orig = ctx.createOscillator;
  ctx.createOscillator = function () {
    var o = orig();
    voices.push(o);
    return o;
  };
  sound.play(ctx, 0);
  return collect(sound.every / 1000, voices);
}

fs.mkdirSync(OUT, { recursive: true });
sounds.LIST.forEach(function (sound) {
  var rendered = playInto(sound);
  var file = path.join(OUT, "snd_" + sound.id + ".wav");
  writeWav(file, rendered.pcm);
  var loud = 0;
  for (var i = 0; i < rendered.pcm.length; i++) loud = Math.max(loud, Math.abs(rendered.pcm[i]));
  if (!(rendered.peak > 0.01) || loud < 1000) {
    console.error("FAIL " + sound.id + " peak " + rendered.peak + " pcm " + loud);
    process.exitCode = 1;
  } else {
    console.log("ok " + sound.id + " " + (sound.every / 1000).toFixed(2) + "s peakIn " + rendered.peak.toFixed(3) + " -> " + file);
  }
});
