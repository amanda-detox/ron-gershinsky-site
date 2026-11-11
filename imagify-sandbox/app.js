/* Imagify sandbox. Original files are stored as Blobs in IndexedDB and are never
   drawn to a canvas, resized, or re-encoded. A separate thumbnail is optional. */
(function () {
  "use strict";

  var DB = "rg-imagify-sandbox";
  var STORE = "photos";
  var INST_KEY = "rg-imagify-sbx-inst";
  var THUMB_MAX = 960;

  var items = [];
  var viewerIndex = -1;
  var viewerUrl = null;
  var cardUrls = [];
  var pendingDelete = null;
  var deferred = null;
  var installedNow = false;
  var drag = null;

  var STEPS = {
    iosSafari: "<ol><li>לוחצים על כפתור השיתוף <b>(□↑)</b> בסרגל של Safari.</li><li>גוללים ובוחרים <b>„הוסף למסך הבית”</b>.</li><li>לוחצים <b>„הוסף”</b>. האייקון של תמונותיפיי יופיע במסך הבית.</li></ol>",
    iosOther: "<ol><li>קודם פותחים את הדף ב־<b>Safari</b>: בתפריט (⋯ או ⋮) בוחרים <b>„פתח ב־Safari”</b> או <b>„פתח בדפדפן”</b>.</li><li>ב־Safari לוחצים על כפתור השיתוף <b>(□↑)</b>.</li><li>בוחרים <b>„הוסף למסך הבית”</b> ואז <b>„הוסף”</b>.</li></ol>",
    android: "<ol><li>פותחים את תפריט הדפדפן: <b>⋮</b> למעלה ב־Chrome, או <b>☰</b> למטה ב־Samsung Internet.</li><li>בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b>.</li><li>מאשרים, והאייקון של תמונותיפיי יופיע במסך הבית.</li></ol>",
    desktop: "<ol><li>ב־Chrome: לוחצים על סמל ההתקנה בשורת הכתובת, או בתפריט <b>⋮</b> ← <b>„העברה, שמירה ושיתוף”</b> ← <b>„התקנת הדף כאפליקציה”</b>.</li><li>בטלפון: פותחים את הכתובת בדפדפן ובוחרים <b>„הוספה למסך הבית”</b>.</li></ol>"
  };

  function $(id) { return document.getElementById(id); }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isImage(file) {
    if (file.type && file.type.indexOf("image/") === 0) return true;
    return /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif|tiff?)$/i.test(file.name || "");
  }

  function formatDate(ts) {
    try {
      return new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
    } catch (e) {
      return "";
    }
  }

  function formatSize(n) {
    if (typeof n !== "number" || !isFinite(n)) return "";
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
    return (n / 1048576).toFixed(1) + " MB";
  }

  function countLabel(n) {
    if (n === 1) return "תמונה אחת";
    return n + " תמונות";
  }

  function setStatus(text) { $("status").textContent = text || ""; }

  var dbp = null;
  function openDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { dbp = null; reject(req.error); };
    });
    return dbp;
  }

  function withStore(mode, fn) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, mode);
        var result = fn(tx.objectStore(STORE));
        tx.oncomplete = function () { resolve(result); };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error || new Error("aborted")); };
      });
    });
  }

  function loadAll() {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  /* Thumbnail only. The File passed in is not replaced or re-encoded. */
  function makeThumb(file) {
    if (!window.createImageBitmap) return Promise.resolve(null);
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, THUMB_MAX / Math.max(bmp.width, bmp.height));
      var w = Math.max(1, Math.round(bmp.width * scale));
      var h = Math.max(1, Math.round(bmp.height * scale));
      var canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) { resolve(blob); }, "image/jpeg", 0.82);
      });
    }).catch(function () { return null; });
  }

  function saveOne(file) {
    var size = file.size;
    return makeThumb(file).then(function (thumb) {
      var rec = {
        id: uid(),
        name: file.name || "תמונה",
        type: file.type || (thumb ? "" : ""),
        size: size,
        date: file.lastModified || Date.now(),
        added: Date.now(),
        blob: file,
        thumb: thumb
      };
      return withStore("readwrite", function (store) { store.put(rec); });
    });
  }

  function deleteId(id) {
    return withStore("readwrite", function (store) { store.delete(id); });
  }

  function revokeCards() {
    cardUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    cardUrls = [];
  }

  function refresh() {
    return loadAll().then(function (rows) {
      items = rows.sort(function (a, b) { return (b.added || 0) - (a.added || 0); });
      render();
      if (!$("viewer").hidden) {
        if (!items.length) closeViewer();
        else showViewer(Math.min(viewerIndex, items.length - 1));
      }
    });
  }

  function render() {
    revokeCards();
    var list = $("cards");
    list.textContent = "";
    $("empty").hidden = items.length !== 0;
    $("count").textContent = items.length ? countLabel(items.length) : "";
    items.forEach(function (rec) {
      var card = document.createElement("article");
      card.className = "card";
      var hit = document.createElement("button");
      hit.type = "button";
      hit.className = "photo-hit";
      hit.setAttribute("aria-label", "פתיחה במסך מלא: " + (rec.name || "תמונה"));
      var img = document.createElement("img");
      var srcBlob = rec.thumb || rec.blob;
      var url = URL.createObjectURL(srcBlob);
      cardUrls.push(url);
      img.src = url;
      img.alt = rec.name || "תמונה";
      hit.appendChild(img);
      hit.onclick = function () { openViewer(rec.id); };

      var body = document.createElement("div");
      body.className = "card-body";
      var name = document.createElement("h2");
      name.className = "card-name";
      name.dir = "auto";
      name.textContent = rec.name || "תמונה";
      var meta = document.createElement("p");
      meta.className = "card-meta";
      var when = document.createElement("span");
      when.textContent = formatDate(rec.date || rec.added);
      meta.appendChild(when);
      var sizeText = formatSize(rec.blob && typeof rec.blob.size === "number" ? rec.blob.size : rec.size);
      if (sizeText) {
        var sizeEl = document.createElement("span");
        sizeEl.className = "size";
        sizeEl.dir = "ltr";
        sizeEl.textContent = sizeText;
        meta.appendChild(sizeEl);
      }

      var actions = document.createElement("div");
      actions.className = "card-actions";
      actions.appendChild(actionBtn("פתיחה", false, function () { openViewer(rec.id); }));
      actions.appendChild(actionBtn("שיתוף", false, function () { shareOrDownload(rec); }));
      actions.appendChild(actionBtn("מחיקה", true, function () { askDelete(rec); }));

      body.appendChild(name);
      body.appendChild(meta);
      body.appendChild(actions);
      card.appendChild(hit);
      card.appendChild(body);
      list.appendChild(card);
    });
  }

  function actionBtn(label, ghost, fn) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn slim" + (ghost ? " ghost" : "");
    b.textContent = label;
    b.onclick = fn;
    return b;
  }

  function current() {
    return viewerIndex >= 0 && viewerIndex < items.length ? items[viewerIndex] : null;
  }

  function openViewer(id) {
    var i = -1;
    for (var n = 0; n < items.length; n++) if (items[n].id === id) i = n;
    if (i < 0) return;
    showViewer(i);
  }

  function showViewer(i) {
    if (i < 0 || i >= items.length) return;
    viewerIndex = i;
    var rec = items[i];
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    viewerUrl = URL.createObjectURL(rec.blob);
    var img = $("viewer-img");
    img.style.transition = "none";
    img.style.transform = "translateX(0)";
    img.src = viewerUrl;
    img.alt = rec.name || "תמונה";
    $("viewer-name").textContent = rec.name || "תמונה";
    $("viewer-name").dir = "auto";
    var size = formatSize(rec.blob && rec.blob.size);
    var dateEl = $("viewer-date");
    dateEl.textContent = "";
    dateEl.appendChild(document.createTextNode(formatDate(rec.date || rec.added)));
    if (size) {
      var sizeEl = document.createElement("span");
      sizeEl.dir = "ltr";
      sizeEl.textContent = size;
      dateEl.appendChild(sizeEl);
    }
    $("viewer-count").textContent = (i + 1) + " / " + items.length;
    $("viewer").hidden = false;
    document.body.classList.add("viewer-open");
  }

  function closeViewer(swallowClick) {
    $("viewer").hidden = true;
    document.body.classList.remove("viewer-open");
    $("viewer-img").removeAttribute("src");
    if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
    viewerIndex = -1;
    if (!swallowClick) return;
    /* A touch tap also synthesizes a click. Once the viewer is gone that click
       hits the card underneath and would open it again. Eat that one click. */
    function eat(ev) {
      document.removeEventListener("click", eat, true);
      ev.preventDefault();
      ev.stopPropagation();
    }
    document.addEventListener("click", eat, true);
    setTimeout(function () { document.removeEventListener("click", eat, true); }, 700);
  }

  function stepViewer(dir) {
    showViewer(viewerIndex + dir);
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest("button, a")) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), dx: 0, dy: 0 };
    $("viewer-img").style.transition = "none";
    /* Cancelling pointerdown stops the synthetic click Chrome fires after a touch tap,
       which would otherwise land on the card underneath once the viewer closes. */
    try { e.preventDefault(); } catch (err) {}
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    if (Math.abs(drag.dx) > 6 && Math.abs(drag.dx) > Math.abs(drag.dy)) {
      $("viewer-img").style.transform = "translateX(" + drag.dx + "px)";
    }
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    var img = $("viewer-img");
    var absX = Math.abs(d.dx);
    var absY = Math.abs(d.dy);
    img.style.transition = "none";
    img.style.transform = "translateX(0)";
    if (absX < 12 && absY < 12 && Date.now() - d.t < 500) {
      closeViewer(true);
      return;
    }
    if (absX >= 48 && absX > absY) stepViewer(d.dx < 0 ? 1 : -1);
  }

  function downloadName(rec) {
    if (rec.name) return rec.name;
    var type = (rec.blob && rec.blob.type) || rec.type || "";
    var ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "jpg";
    return "imagify." + ext;
  }

  function shareOrDownload(rec) {
    var blob = rec.blob;
    if (!blob) return;
    var name = downloadName(rec);
    var type = blob.type || rec.type || "application/octet-stream";
    var file = null;
    try { file = new File([blob], name, { type: type, lastModified: rec.date || Date.now() }); } catch (e) {}
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: name }).catch(function (err) {
        if (!err || err.name !== "AbortError") downloadBlob(blob, name);
      });
      return;
    }
    downloadBlob(blob, name);
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function askDelete(rec) {
    pendingDelete = rec;
    $("confirm-body").textContent = "«" + (rec.name || "תמונה") + "» תימחק מהמכשיר הזה. אי אפשר לשחזר אותה מכאן.";
    $("confirm").hidden = false;
    try { $("confirm-cancel").focus(); } catch (e) {}
  }

  function closeConfirm() {
    pendingDelete = null;
    $("confirm").hidden = true;
  }

  function confirmDelete() {
    var rec = pendingDelete;
    closeConfirm();
    if (!rec) return;
    deleteId(rec.id).then(function () {
      setStatus("התמונה נמחקה מהמכשיר.");
      return refresh();
    }).catch(function () { setStatus("לא הצלחנו למחוק. נסו שוב."); });
  }

  function onFiles(input) {
    var files = Array.prototype.slice.call(input.files || []);
    input.value = "";
    var accepted = files.filter(isImage);
    if (!accepted.length) {
      setStatus(files.length ? "אפשר לשמור רק קבצי תמונה." : "");
      return;
    }
    setStatus("שומר…");
    $("add-btn").disabled = true;
    $("cam-btn").disabled = true;
    var chain = Promise.resolve();
    accepted.forEach(function (file) {
      chain = chain.then(function () { return saveOne(file); });
    });
    chain.then(function () {
      setStatus(accepted.length === 1 ? "התמונה נשמרה במכשיר." : "נשמרו " + accepted.length + " תמונות במכשיר.");
      return refresh();
    }).catch(function () {
      setStatus("לא הצלחנו לשמור. נסו שוב.");
    }).then(function () {
      $("add-btn").disabled = false;
      $("cam-btn").disabled = false;
    });
  }

  function standalone() {
    var mm = window.matchMedia;
    return (mm && (mm("(display-mode: standalone)").matches || mm("(display-mode: fullscreen)").matches || mm("(display-mode: minimal-ui)").matches)) || navigator.standalone === true;
  }

  function installDismissed() {
    try { return localStorage.getItem(INST_KEY) === "1"; } catch (e) { return false; }
  }

  function installKey() {
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return (/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|WhatsApp|Line\//.test(ua)) ? "iosSafari" : "iosOther";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
  }

  function updateInstall() {
    var show = !standalone() && !installedNow && !installDismissed();
    $("install-wrap").hidden = !show;
    if (!show) closeSheet();
  }

  function openSheet() {
    $("sheet-body").innerHTML = STEPS[installKey()] || STEPS.desktop;
    $("sheet").hidden = false;
    try { $("sheet-close").focus(); } catch (e) {}
  }

  function closeSheet() { $("sheet").hidden = true; }

  function onInstallTap() {
    if (deferred && typeof deferred.prompt === "function") {
      var d = deferred;
      deferred = null;
      try { d.prompt(); } catch (e) { openSheet(); return; }
      var done = d.userChoice || Promise.resolve();
      Promise.resolve(done).then(updateInstall, updateInstall);
      return;
    }
    openSheet();
  }

  $("add-btn").onclick = function () { $("file-gallery").click(); };
  $("cam-btn").onclick = function () { $("file-camera").click(); };
  $("file-gallery").addEventListener("change", function () { onFiles($("file-gallery")); });
  $("file-camera").addEventListener("change", function () { onFiles($("file-camera")); });

  $("viewer-close").onclick = closeViewer;
  $("viewer-share").onclick = function () { var rec = current(); if (rec) shareOrDownload(rec); };
  $("viewer-delete").onclick = function () { var rec = current(); if (rec) askDelete(rec); };
  var stage = $("stage");
  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);

  $("confirm-cancel").onclick = closeConfirm;
  $("confirm-ok").onclick = confirmDelete;
  $("confirm").addEventListener("click", function (e) { if (e.target === $("confirm")) closeConfirm(); });

  $("install-btn").onclick = onInstallTap;
  $("install-x").onclick = function () {
    try { localStorage.setItem(INST_KEY, "1"); } catch (e) {}
    updateInstall();
  };
  $("sheet-close").onclick = closeSheet;
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });

  document.addEventListener("keydown", function (e) {
    if (!$("confirm").hidden) {
      if (e.key === "Escape") closeConfirm();
      return;
    }
    if (!$("sheet").hidden) {
      if (e.key === "Escape") closeSheet();
      return;
    }
    if ($("viewer").hidden) return;
    if (e.key === "Escape") closeViewer();
    else if (e.key === "ArrowLeft") { e.preventDefault(); stepViewer(1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); stepViewer(-1); }
  });

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    updateInstall();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    installedNow = true;
    updateInstall();
  });
  if (window.matchMedia) {
    var mq = window.matchMedia("(display-mode: standalone)");
    if (mq.addEventListener) mq.addEventListener("change", updateInstall);
    else if (mq.addListener) mq.addListener(updateInstall);
  }

  document.title = "Imagify";
  updateInstall();
  refresh().catch(function () { setStatus("לא הצלחנו לפתוח את האלבום במכשיר."); });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
