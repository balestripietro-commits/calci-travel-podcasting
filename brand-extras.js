/* Travel Podcasting · extra di identità per i siti dei Comuni
   Tappe ascoltate, collezione di forme, "percorso completato", anello del play,
   animazione di cambio forma. Richiede app.js (tappe, getStopShape, STOP_ARTWORKS). */
(function () {
  "use strict";
  var KEY = "tp-" + (document.documentElement.dataset.tpTheme || "sito") + "-ascoltate";
  var heard = new Set();
  try { heard = new Set(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch (e) { /* senza memoria locale */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(Array.from(heard))); } catch (e) { /* ignora */ } }

  var LANDING = "https://balestripietro-commits.github.io/landing-page-travel-podcasting/";
  var T = {
    it: { coll: "Le tue tappe", of: "di", heard: "Tappa {n} ascoltata", todo: "Tappa {n} da ascoltare", done: "Hai ascoltato tutto il percorso", share: "Condividi il percorso", close: "Chiudi", shareTitle: "Ho ascoltato tutto il percorso di Vicopisano", copied: "Link copiato", copy: "Copia il link", logo: "Travel Podcasting: scopri il progetto (si apre in una nuova scheda)" },
    en: { coll: "Your stops", of: "of", heard: "Stop {n} listened", todo: "Stop {n} not yet listened", done: "You have listened to the whole route", share: "Share the route", close: "Close", shareTitle: "I listened to the whole Vicopisano route", copied: "Link copied", copy: "Copy the link", logo: "Travel Podcasting: discover the project (opens in a new tab)" },
    de: { coll: "Deine Stationen", of: "von", heard: "Station {n} gehört", todo: "Station {n} noch nicht gehört", done: "Du hast die ganze Route gehört", share: "Route teilen", close: "Schließen", shareTitle: "Ich habe die ganze Route durch Vicopisano gehört", copied: "Link kopiert", copy: "Link kopieren", logo: "Travel Podcasting: das Projekt entdecken (öffnet in neuem Tab)" },
    fr: { coll: "Vos étapes", of: "sur", heard: "Étape {n} écoutée", todo: "Étape {n} pas encore écoutée", done: "Vous avez écouté tout le parcours", share: "Partager le parcours", close: "Fermer", shareTitle: "J'ai écouté tout le parcours de Vicopisano", copied: "Lien copié", copy: "Copier le lien", logo: "Travel Podcasting : découvrir le projet (s'ouvre dans un nouvel onglet)" },
    es: { coll: "Tus etapas", of: "de", heard: "Etapa {n} escuchada", todo: "Etapa {n} por escuchar", done: "Has escuchado todo el recorrido", share: "Compartir el recorrido", close: "Cerrar", shareTitle: "He escuchado todo el recorrido de Vicopisano", copied: "Enlace copiado", copy: "Copiar el enlace", logo: "Travel Podcasting: conoce el proyecto (se abre en una pestaña nueva)" },
    pt: { coll: "As suas etapas", of: "de", heard: "Etapa {n} ouvida", todo: "Etapa {n} por ouvir", done: "Ouviu todo o percurso", share: "Partilhar o percurso", close: "Fechar", shareTitle: "Ouvi todo o percurso de Vicopisano", copied: "Ligação copiada", copy: "Copiar a ligação", logo: "Travel Podcasting: conheça o projeto (abre num novo separador)" },
    ru: { coll: "Ваши остановки", of: "из", heard: "Остановка {n} прослушана", todo: "Остановка {n} ещё не прослушана", done: "Вы прослушали весь маршрут", share: "Поделиться маршрутом", close: "Закрыть", shareTitle: "Я прослушал(а) весь маршрут по Викопизано", copied: "Ссылка скопирована", copy: "Скопировать ссылку", logo: "Travel Podcasting: узнать о проекте (откроется в новой вкладке)" },
    zh: { coll: "你的站点", of: "/", heard: "第{n}站已收听", todo: "第{n}站待收听", done: "你已听完整条路线", share: "分享路线", close: "关闭", shareTitle: "我听完了维科皮萨诺的整条路线", copied: "链接已复制", copy: "复制链接", logo: "Travel Podcasting：了解这个项目（在新标签页打开）" },
    ar: { coll: "محطاتك", of: "من", heard: "المحطة {n} تم الاستماع إليها", todo: "المحطة {n} لم يُستمع إليها بعد", done: "لقد استمعتم إلى المسار كاملاً", share: "شاركوا المسار", close: "إغلاق", shareTitle: "استمعتُ إلى مسار فيكوبيزانو كاملاً", copied: "تم نسخ الرابط", copy: "انسخوا الرابط", logo: "Travel Podcasting: اكتشفوا المشروع (يُفتح في تبويب جديد)" }
  };
  var T2 = {
    it: { stopsN: "{n} tappe", rem1: "Ti manca 1 tappa · circa {m} min", remN: "Ti mancano {k} tappe · circa {m} min", all: "Percorso completato", total: "circa {m} min tra ascolto e cammino", pBtn: "Il tuo passaporto dei borghi", pDone: "Percorso completato", pTodo: "Da scoprire", stamp: "Timbro aggiunto al tuo passaporto", pHint: "Ogni percorso completato è un timbro con la forma del borgo." },
    en: { stopsN: "{n} stops", rem1: "1 stop left · about {m} min", remN: "{k} stops left · about {m} min", all: "Route completed", total: "about {m} min listening and walking", pBtn: "Your village passport", pDone: "Route completed", pTodo: "To discover", stamp: "Stamp added to your passport", pHint: "Every completed route is a stamp in the shape of the village." },
    de: { stopsN: "{n} Stationen", rem1: "Noch 1 Station · etwa {m} Min.", remN: "Noch {k} Stationen · etwa {m} Min.", all: "Route abgeschlossen", total: "etwa {m} Min. Hören und Gehen", pBtn: "Dein Dorf-Pass", pDone: "Route abgeschlossen", pTodo: "Noch zu entdecken", stamp: "Stempel in deinem Pass hinzugefügt", pHint: "Jede abgeschlossene Route ist ein Stempel in der Form des Dorfes." },
    fr: { stopsN: "{n} étapes", rem1: "Plus qu'une étape · environ {m} min", remN: "Encore {k} étapes · environ {m} min", all: "Parcours terminé", total: "environ {m} min d'écoute et de marche", pBtn: "Votre passeport des villages", pDone: "Parcours terminé", pTodo: "À découvrir", stamp: "Tampon ajouté à votre passeport", pHint: "Chaque parcours terminé est un tampon à la forme du village." },
    es: { stopsN: "{n} etapas", rem1: "Te queda 1 etapa · unos {m} min", remN: "Te quedan {k} etapas · unos {m} min", all: "Recorrido completado", total: "unos {m} min entre escucha y paseo", pBtn: "Tu pasaporte de pueblos", pDone: "Recorrido completado", pTodo: "Por descubrir", stamp: "Sello añadido a tu pasaporte", pHint: "Cada recorrido completado es un sello con la forma del pueblo." },
    pt: { stopsN: "{n} etapas", rem1: "Falta 1 etapa · cerca de {m} min", remN: "Faltam {k} etapas · cerca de {m} min", all: "Percurso concluído", total: "cerca de {m} min entre audição e caminhada", pBtn: "O seu passaporte das aldeias", pDone: "Percurso concluído", pTodo: "Por descobrir", stamp: "Carimbo adicionado ao seu passaporte", pHint: "Cada percurso concluído é um carimbo com a forma da aldeia." },
    ru: { stopsN: "{n} остановок", rem1: "Осталась 1 остановка · около {m} мин", remN: "Осталось остановок: {k} · около {m} мин", all: "Маршрут пройден", total: "около {m} мин на прослушивание и ходьбу", pBtn: "Ваш паспорт городков", pDone: "Маршрут пройден", pTodo: "Предстоит открыть", stamp: "Печать добавлена в ваш паспорт", pHint: "Каждый пройденный маршрут — это печать в форме городка." },
    zh: { stopsN: "{n}个站点", rem1: "还剩1站 · 约{m}分钟", remN: "还剩{k}站 · 约{m}分钟", all: "路线已完成", total: "收听加步行约{m}分钟", pBtn: "你的村镇护照", pDone: "路线已完成", pTodo: "待探索", stamp: "已为你的护照盖章", pHint: "每完成一条路线，就得到一枚村镇形状的印章。", minU: "分钟", kmU: "公里" },
    ar: { stopsN: "{n} محطات", rem1: "بقيت محطة واحدة · نحو {m} دقيقة", remN: "بقيت {k} محطات · نحو {m} دقيقة", all: "اكتمل المسار", total: "نحو {m} دقيقة بين الاستماع والمشي", pBtn: "جواز سفر القرى", pDone: "اكتمل المسار", pTodo: "للاكتشاف", stamp: "أُضيف ختم إلى جواز سفركم", pHint: "كل مسار مكتمل هو ختم بشكل القرية.", minU: "د", kmU: "كم" }
  };
  /* Dati del sito: durata di ogni traccia in secondi e nome del Comune (si impostano in index.html con window.TP_SITE) */
  var CFG = window.TP_SITE || {};
  var STOP_SECONDS = CFG.stopSeconds || {};
  function routeKm() {
    try {
      var c = routeGeoJson.features[0].geometry.coordinates, km = 0, R = 6371;
      for (var i = 1; i < c.length; i++) {
        var la1 = c[i - 1][1] * Math.PI / 180, la2 = c[i][1] * Math.PI / 180;
        var dla = la2 - la1, dlo = (c[i][0] - c[i - 1][0]) * Math.PI / 180;
        var a = Math.sin(dla / 2) * Math.sin(dla / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dlo / 2) * Math.sin(dlo / 2);
        km += 2 * R * Math.asin(Math.sqrt(a));
      }
      return km;
    } catch (e) { return 0; }
  }
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function tr() {
    var code = String((typeof currentLanguage !== "undefined" ? currentLanguage : document.documentElement.lang) || "it").toLowerCase();
    var base = T[code] || T.it, more = T2[code] || T2.it;
    var out = {}, k;
    for (k in base) out[k] = base[k];
    for (k in more) out[k] = more[k];
    return out;
  }

  var collection = null;
  var overlay = null;

  function art(t) { return STOP_ARTWORKS[t.numero] || ""; }

  function renderCollection() {
    var panel = document.querySelector(".stops-panel");
    var list = document.getElementById("stops-list");
    if (!panel || !list || typeof tappe === "undefined") return;
    if (!collection) {
      collection = document.createElement("section");
      collection.className = "stop-collection";
      collection.setAttribute("aria-label", "Le tue tappe ascoltate");
      list.parentNode.insertBefore(collection, list);
    }
    var items = tappe.map(function (t) {
      var on = heard.has(t.numero);
      return '<button type="button" class="col-thumb-btn" data-stop="' + t.numero + '" aria-label="' + t.numero + ". " + String(t.titolo).replace(/"/g, "&quot;") + '"><img class="col-thumb' + (on ? " is-heard" : "") + '" data-shape="' + (window.getPhotoShape||getStopShape)(t.titolo) +
        '" src="' + art(t) + '" alt="' + (on ? tr().heard : tr().todo).replace("{n}", t.numero) + '" decoding="async"></button>';
    }).join("");
    var km = routeKm(), walk = km / 4.5 * 60, sec = 0, remSec = 0, left = 0;
    tappe.forEach(function (t) {
      var s = STOP_SECONDS[t.numero] || 180;
      sec += s;
      if (!heard.has(t.numero)) { remSec += s; left++; }
    });
    var total = Math.round(sec / 60 + walk);
    var remMin = Math.round(remSec / 60 + walk * left / tappe.length);
    var status = left === 0 ? tr().all : (left === 1 ? fill(tr().rem1, { m: remMin }) : fill(tr().remN, { k: left, m: remMin }));
    var segs = tappe.map(function (t) { return '<i class="seg' + (heard.has(t.numero) ? " is-heard" : "") + '"></i>'; }).join("");
    var chips = '<span class="chip">' + fill(tr().stopsN, { n: tappe.length }) + '</span><span class="chip">' + total + ' ' + (tr().minU || 'min') + '</span>' +
      (km ? '<span class="chip chip-km">' + km.toLocaleString(String(document.documentElement.lang || "it"), { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + ' ' + (tr().kmU || 'km') + '</span>' : "");
    collection.innerHTML = '<div class="stop-collection-head"><strong>' + tr().coll + '</strong><span>' + heard.size + " " + tr().of + " " + tappe.length +
      '</span></div><div class="stop-collection-chips">' + chips + '</div><div class="stop-collection-segs">' + segs + '</div><div class="stop-collection-status">' + status +
      '</div><div class="stop-collection-row">' + items + '</div>';
    collection.querySelectorAll(".col-thumb-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = tappe.findIndex(function (t) { return String(t.numero) === b.dataset.stop; });
        var target = document.querySelectorAll(".stop-button")[idx];
        if (target) target.click();
      });
    });
  }

  function applyHeard() {
    var buttons = document.querySelectorAll(".stops-list .stop-button");
    buttons.forEach(function (b, i) {
      if (tappe[i]) b.classList.toggle("is-heard", heard.has(tappe[i].numero));
    });
    document.querySelectorAll(".map-marker[data-stop]").forEach(function (m) {
      m.classList.toggle("is-heard", heard.has(Number(m.dataset.stop)));
    });
    renderCollection();
  }

  function share() {
    var url = new URL("./", window.location.href).href;
    var data = { title: tr().shareTitle, text: "Travel Podcasting · " + (CFG.name || ""), url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    try { navigator.clipboard.writeText(url); alert(tr().copied); } catch (e) { window.prompt(tr().copy, url); }
  }

  function showComplete() {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "tp-complete";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-labelledby", "tp-complete-title");
      overlay.hidden = true;
      var mosaic = tappe.map(function (t) {
        return '<img class="tp-complete-thumb" data-shape="' + (window.getPhotoShape||getStopShape)(t.titolo) + '" src="' + art(t) + '" alt="">';
      }).join("");
      overlay.innerHTML = '<div class="tp-complete-card"><h2 id="tp-complete-title"></h2>' +
        '<div class="tp-complete-mosaic">' + mosaic + "</div>" +
        '<div class="tp-complete-actions"><button type="button" class="tp-complete-share"></button>' +
        '<button type="button" class="tp-complete-close"></button></div></div>';
      document.body.appendChild(overlay);
      overlay.querySelector(".tp-complete-share").addEventListener("click", share);
      overlay.querySelector(".tp-complete-close").addEventListener("click", function () { overlay.hidden = true; });
      overlay.addEventListener("click", function (e) { if (e.target === overlay) overlay.hidden = true; });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") overlay.hidden = true; });
    }
    overlay.querySelector("#tp-complete-title").textContent = tr().done;
    overlay.querySelector(".tp-complete-share").textContent = tr().share;
    overlay.querySelector(".tp-complete-close").textContent = tr().close;
    var st = overlay.querySelector(".tp-complete-stamp");
    if (!st) { st = document.createElement("p"); st.className = "tp-complete-promo tp-complete-stamp"; overlay.querySelector(".tp-complete-card").appendChild(st); }
    st.textContent = tr().stamp;
    overlay.hidden = false;
    var close = overlay.querySelector(".tp-complete-close");
    if (close) close.focus();
  }

  function mark(stop) {
    if (stop == null || heard.has(stop)) return;
    heard.add(stop);
    save();
    applyHeard();
    if (typeof tappe !== "undefined" && heard.size === tappe.length) showComplete();
  }

  function ensureRing(el) {
    if (el.querySelector(".play-ring")) return;
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "play-ring");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<circle class="play-ring-bg" cx="50" cy="50" r="46" pathLength="100"/><circle class="play-ring-fg" cx="50" cy="50" r="46" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100"/>';
    el.appendChild(svg);
  }
  function setRing(ratio) {
    var off = 100 - Math.round(Math.max(0, Math.min(1, ratio || 0)) * 1000) / 10;
    ["player-play-button", "mini-player-toggle"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      ensureRing(el);
      var fg = el.querySelector(".play-ring-fg");
      if (fg) fg.setAttribute("stroke-dashoffset", String(off));
    });
  }

  window.TPExtras = {
    progress: function (stop, ratio) {
      setRing(ratio);
      if (ratio >= 0.9) mark(stop);
    },
    ended: function (stop) { mark(stop); },
    isHeard: function (n) { return heard.has(n); },
  };

  /* Cambio forma: piccola animazione quando cambiano foto o forma */
  function watchShapes() {
    var ids = ["stop-preview-image", "detail-artwork-image", "mini-player-artwork"];
    var obs = new MutationObserver(function (list) {
      list.forEach(function (m) {
        var el = m.target;
        el.classList.remove("shape-swap");
        void el.offsetWidth;
        el.classList.add("shape-swap");
        setTimeout(function () { el.classList.remove("shape-swap"); }, 700);
      });
    });
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el, { attributes: true, attributeFilter: ["data-shape"] });
    });
  }

  function applyLang() {
    var link = document.getElementById("brand-link");
    if (link) { link.setAttribute("aria-label", tr().logo); link.title = tr().logo; }
    renderCollection();
  }

  /* All'apertura il sito resta in cima (mascotte e titolo), senza saltare alla mappa */
  var moved = false;
  ["touchstart", "wheel", "keydown", "mousedown"].forEach(function (ev) { window.addEventListener(ev, function () { moved = true; }, { passive: true, once: true }); });
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) { /* ignora */ }
  function toTop() { if (!moved && !location.hash) window.scrollTo(0, 0); }
  window.addEventListener("load", function () { toTop(); setTimeout(toTop, 500); setTimeout(toTop, 1500); });

  function start() {
    applyHeard();
    applyLang();
    new MutationObserver(applyLang).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    watchShapes();
    var list = document.getElementById("stops-list");
    if (list) new MutationObserver(applyHeard).observe(list, { childList: true });
    var pane = document.querySelector(".leaflet-marker-pane");
    if (pane) new MutationObserver(function () { applyHeard(); }).observe(pane, { childList: true });
  }

  /* Un tocco sulla mascotte, in qualsiasi schermata, la fa saltare (home, mappa, player) */
  function hopMascot(shell) {
    if (!shell || shell.classList.contains("mascot-motion-shell--hero")) return; /* la mascotte della home ha già il suo salto */
    shell.classList.remove("is-hopping");
    void shell.offsetWidth;
    shell.classList.add("is-hopping");
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* ignora */ }
    clearTimeout(shell._hopTimer);
    shell._hopTimer = setTimeout(function () { shell.classList.remove("is-hopping"); }, 700);
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest(".mascot-motion-shell, .map-explore-mascot") : null;
    if (!t) return;
    hopMascot(t.classList.contains("mascot-motion-shell") ? t : t.querySelector(".mascot-motion-shell"));
  }, true);

  /* Animazioni della mascotte riportabili su altre mascotte (Calci...): solo movimento del corpo, nessun disegno specifico */
  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function greet() {
    document.querySelectorAll(".mascot-motion-shell").forEach(function (sh) {
      if (!sh.offsetParent) return;
      sh.classList.remove("is-greeting"); void sh.offsetWidth; sh.classList.add("is-greeting");
      clearTimeout(sh._greetTimer); sh._greetTimer = setTimeout(function () { sh.classList.remove("is-greeting"); }, 1300);
    });
  }
  if (!reducedMotion) {
    var titleEl = document.getElementById("detail-title-text");
    if (titleEl) new MutationObserver(function () { setTimeout(greet, 350); }).observe(titleEl, { childList: true, characterData: true, subtree: true });
    new MutationObserver(function (list) {
      list.forEach(function (m) { if (document.body.classList.contains("player-open") && !(m.oldValue || "").split(/\s+/).includes("player-open")) setTimeout(greet, 500); });
    }).observe(document.body, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
