(function () {
  "use strict";
  var T = {
    he: { title: "חישובלי", hint: "אפשר להקליד: 1.6*80 כפול 5 · כפול, חלקי, פלוס, מינוס, x", hist: "חישובים אחרונים", clearHist: "ניקוי היסטוריה", err: "תרגיל לא תקין", lang: "English" },
    en: { title: "Calcify", hint: "You can type: 1.6*80*5 · words כפול/חלקי/פלוס/מינוס, x, ×, ÷ work too", hist: "Recent calculations", clearHist: "Clear history", err: "Invalid expression", lang: "עברית" }
  };
  // ---- safe parser (no eval) ----
  function normalize(s) {
    return String(s)
      .replace(/כפול|כפל/g, "*").replace(/חלקי|לחלק ב|חלק/g, "/").replace(/פלוס|ועוד/g, "+").replace(/מינוס|פחות/g, "-")
      .replace(/[×xX✕·]/g, "*").replace(/[÷:]/g, "/").replace(/[−–—]/g, "-").replace(/,/g, ".");
  }
  function tokenize(s) {
    var t = [], i = 0, m;
    s = normalize(s);
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if ((m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i)))) { t.push({ n: parseFloat(m[1]) }); i += m[1].length; continue; }
      if ("+-*/()%".indexOf(c) >= 0) { t.push({ o: c }); i++; continue; }
      throw new Error("bad");
    }
    return t;
  }
  function calc(src) {
    var t = tokenize(src), p = 0;
    if (!t.length) throw new Error("empty");
    function peek() { return t[p]; }
    function expr() { var v = term(); while (peek() && (peek().o === "+" || peek().o === "-")) { var o = t[p++].o, r = term(); v = o === "+" ? v + r : v - r; } return v; }
    function term() {
      var v = unary();
      while (peek() && (peek().o === "*" || peek().o === "/" || peek().o === "(" || peek().n !== undefined)) {
        var o = peek().o; if (o === "*" || o === "/") p++; else o = "*"; // implicit multiply: 2(3)
        var r = unary();
        if (o === "/" && r === 0) throw new Error("div0");
        v = o === "*" ? v * r : v / r;
      }
      return v;
    }
    function unary() { if (peek() && (peek().o === "-" || peek().o === "+")) { var o = t[p++].o, v = unary(); return o === "-" ? -v : v; } return post(); }
    function post() { var v = prim(); while (peek() && peek().o === "%") { p++; v = v / 100; } return v; }
    function prim() {
      var k = t[p++]; if (!k) throw new Error("end");
      if (k.n !== undefined) return k.n;
      if (k.o === "(") { var v = expr(); if (!peek() || peek().o !== ")") throw new Error("paren"); p++; return v; }
      throw new Error("tok");
    }
    var v = expr(); if (p !== t.length) throw new Error("trail");
    if (!isFinite(v)) throw new Error("inf");
    return v;
  }
  function fmt(v) {
    var r = parseFloat(v.toPrecision(12)); // removes float noise: 1.6*80*5 -> 640
    if (Object.is(r, -0)) r = 0;
    return Math.abs(r) >= 1e15 || (r !== 0 && Math.abs(r) < 1e-9) ? r.toExponential(8).replace(/\.?0+e/, "e") : String(r);
  }
  window.Calcify = { calc: calc, fmt: fmt };
  if (typeof document === "undefined" || !document.getElementById("expr")) return;
  // ---- UI ----
  var LANG_KEY = "rg-lang", H_KEY = "rg-calc-history";
  var lang = "he"; try { if (localStorage.getItem(LANG_KEY) === "en") lang = "en"; } catch (e) {}
  var ex = document.getElementById("expr"), res = document.getElementById("res"), hl = document.getElementById("hist");
  var hist = []; try { hist = JSON.parse(localStorage.getItem(H_KEY) || "[]"); } catch (e) { hist = []; }
  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-t]").forEach(function (el) { el.textContent = T[lang][el.getAttribute("data-t")]; });
    document.getElementById("langBtn").textContent = T[lang].lang;
    document.title = lang === "en" ? "Calcify · חישובלי" : "חישובלי · Calcify";
  }
  function renderHist() {
    hl.innerHTML = "";
    hist.forEach(function (h) {
      var li = document.createElement("li"), a = document.createElement("span"), b = document.createElement("b");
      a.textContent = h.e + " ="; b.textContent = h.r; li.appendChild(a); li.appendChild(b);
      li.onclick = function () { ex.value = h.r; preview(); ex.focus(); };
      hl.appendChild(li);
    });
  }
  function preview() { res.classList.remove("err"); try { res.textContent = ex.value.trim() ? fmt(calc(ex.value)) : ""; } catch (e) { res.textContent = ""; } }
  function equals() {
    if (!ex.value.trim()) return;
    try {
      var r = fmt(calc(ex.value));
      hist.unshift({ e: ex.value.trim(), r: r }); hist = hist.slice(0, 20);
      try { localStorage.setItem(H_KEY, JSON.stringify(hist)); } catch (e) {}
      renderHist(); ex.value = r; res.textContent = r; res.classList.remove("err");
    } catch (e) { res.textContent = T[lang].err; res.classList.add("err"); }
  }
  document.querySelectorAll(".keys button").forEach(function (b) {
    b.addEventListener("click", function () {
      var k = b.getAttribute("data-k");
      if (k === "C") ex.value = ""; else if (k === "BS") ex.value = ex.value.slice(0, -1); else if (k === "=") return equals(); else ex.value += k;
      preview();
    });
  });
  ex.addEventListener("input", preview);
  ex.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); equals(); } });
  document.getElementById("clearHist").onclick = function () { hist = []; try { localStorage.removeItem(H_KEY); } catch (e) {} renderHist(); };
  document.getElementById("langBtn").onclick = function () { lang = lang === "he" ? "en" : "he"; try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} applyLang(); };
  applyLang(); renderHist();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
})();
