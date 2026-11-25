/* Travel Podcasting · controlli comuni ai siti dei Comuni (stesso file in ogni sito).
   - velocità dell'audio con un menu a tendina, accanto alla durata della traccia
   - legenda delle forme delle tappe sotto la mappa
   - narratore e avviso «voce generata con l'AI» nel player
   - piè di pagina con i dati del titolare e il link a privacy e cookie
   Richiede app.js (tappe, STOP_SHAPE_PATHS, getStopShape, setPlaybackRate, PLAYBACK_RATES)
   e window.TP_SITE = { name, narrator } in index.html. */
(function () {
  "use strict";

  var SITE = window.TP_SITE || {};
  var COMUNE = SITE.name || "";
  var NARRATORE = SITE.narrator || "";
  var PRIVACY = "https://balestripietro-commits.github.io/landing-page-travel-podcasting/privacy.html";
  var TITOLARE = "Pietro Balestri · P.IVA 02589890504 · Via Alessandro Volta 20, 56017 Ghezzano, San Giuliano Terme (PI) · balestripietro@gmail.com";

  var T = {
    it: { speed: "Velocità di riproduzione", legend: "Le forme delle tappe", torre: "Torri e fortezze", arco: "Chiese e conventi", blocco: "Palazzi", foglia: "Piazze, strade e natura", lente: "Altri luoghi", narr: "Racconta {n}", ai: "voce generata con l'intelligenza artificiale", made: "Percorso realizzato con il Comune di {c}.", aiFull: "La voce di {n} è generata con l'intelligenza artificiale.", by: "Travel Podcasting è un progetto di", role: "libero professionista", privacy: "Privacy e cookie" },
    en: { speed: "Playback speed", legend: "Stop shapes", torre: "Towers and fortresses", arco: "Churches and convents", blocco: "Palaces", foglia: "Squares, streets and nature", lente: "Other places", narr: "Told by {n}", ai: "AI-generated voice", made: "Route created with the Municipality of {c}.", aiFull: "The voice of {n} is generated with artificial intelligence.", by: "Travel Podcasting is a project by", role: "freelance professional", privacy: "Privacy and cookies" },
    de: { speed: "Wiedergabegeschwindigkeit", legend: "Formen der Stationen", torre: "Türme und Festungen", arco: "Kirchen und Klöster", blocco: "Paläste", foglia: "Plätze, Straßen und Natur", lente: "Andere Orte", narr: "Es erzählt {n}", ai: "mit KI erzeugte Stimme", made: "Route in Zusammenarbeit mit der Gemeinde {c}.", aiFull: "Die Stimme von {n} wird mit künstlicher Intelligenz erzeugt.", by: "Travel Podcasting ist ein Projekt von", role: "Freiberufler", privacy: "Datenschutz und Cookies" },
    fr: { speed: "Vitesse de lecture", legend: "Les formes des étapes", torre: "Tours et forteresses", arco: "Églises et couvents", blocco: "Palais", foglia: "Places, rues et nature", lente: "Autres lieux", narr: "Raconté par {n}", ai: "voix générée par l'intelligence artificielle", made: "Parcours réalisé avec la commune de {c}.", aiFull: "La voix de {n} est générée par l'intelligence artificielle.", by: "Travel Podcasting est un projet de", role: "professionnel indépendant", privacy: "Confidentialité et cookies" },
    es: { speed: "Velocidad de reproducción", legend: "Las formas de las etapas", torre: "Torres y fortalezas", arco: "Iglesias y conventos", blocco: "Palacios", foglia: "Plazas, calles y naturaleza", lente: "Otros lugares", narr: "Narra {n}", ai: "voz generada con inteligencia artificial", made: "Recorrido realizado con el Ayuntamiento de {c}.", aiFull: "La voz de {n} está generada con inteligencia artificial.", by: "Travel Podcasting es un proyecto de", role: "profesional autónomo", privacy: "Privacidad y cookies" },
    pt: { speed: "Velocidade de reprodução", legend: "As formas das etapas", torre: "Torres e fortalezas", arco: "Igrejas e conventos", blocco: "Palácios", foglia: "Praças, ruas e natureza", lente: "Outros lugares", narr: "Narra {n}", ai: "voz gerada com inteligência artificial", made: "Percurso realizado com o Município de {c}.", aiFull: "A voz de {n} é gerada com inteligência artificial.", by: "Travel Podcasting é um projeto de", role: "profissional independente", privacy: "Privacidade e cookies" },
    ru: { speed: "Скорость воспроизведения", legend: "Формы остановок", torre: "Башни и крепости", arco: "Церкви и монастыри", blocco: "Дворцы", foglia: "Площади, улицы и природа", lente: "Другие места", narr: "Рассказывает {n}", ai: "голос создан искусственным интеллектом", made: "Маршрут создан совместно с коммуной {c}.", aiFull: "Голос персонажа {n} создан искусственным интеллектом.", by: "Travel Podcasting — проект", role: "независимый специалист", privacy: "Конфиденциальность и cookie" },
    zh: { speed: "播放速度", legend: "站点形状说明", torre: "塔楼与要塞", arco: "教堂与修道院", blocco: "宫殿", foglia: "广场、街道与自然", lente: "其他地点", narr: "讲述者：{n}", ai: "人工智能生成的声音", made: "本路线与{c}市政府合作完成。", aiFull: "{n}的声音由人工智能生成。", by: "Travel Podcasting 项目负责人：", role: "自由职业者", privacy: "隐私与 Cookie" },
    ar: { speed: "سرعة التشغيل", legend: "أشكال المحطات", torre: "أبراج وحصون", arco: "كنائس وأديرة", blocco: "قصور", foglia: "ساحات وشوارع وطبيعة", lente: "أماكن أخرى", narr: "يروي {n}", ai: "صوت مُولَّد بالذكاء الاصطناعي", made: "مسار أُنجز بالتعاون مع بلدية {c}.", aiFull: "صوت {n} مُولَّد بالذكاء الاصطناعي.", by: "Travel Podcasting مشروع من إعداد", role: "مهني مستقل", privacy: "الخصوصية وملفات تعريف الارتباط" }
  };
  var SHAPE_ORDER = ["torre", "arco", "blocco", "foglia", "lente"];

  function lang() {
    var c = (typeof currentLanguage !== "undefined" ? currentLanguage : document.documentElement.lang) || "it";
    return String(c).toLowerCase();
  }
  function L() { return T[lang()] || T.it; }
  function fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---------- velocità: menu a tendina ---------- */
  var speedSelects = [];
  function rateLabel(r) { return "x" + Number(r).toLocaleString(lang() === "it" ? "it-IT" : lang(), { maximumFractionDigits: 2 }); }
  function buildSpeed(afterId, sourceId, cls) {
    var after = document.getElementById(afterId);
    var source = document.getElementById(sourceId);
    if (!after || !source || typeof PLAYBACK_RATES === "undefined") return;
    var wrap = el("label", "tp-speed " + cls);
    var sel = el("select", "tp-speed-select");
    PLAYBACK_RATES.forEach(function (r) { var o = el("option"); o.value = String(r); o.textContent = rateLabel(r); sel.appendChild(o); });
    wrap.appendChild(sel);
    wrap.appendChild(el("span", "tp-speed-chevron", ""));
    wrap.lastChild.setAttribute("aria-hidden", "true");
    after.parentNode.insertBefore(wrap, after.nextSibling);
    sel.addEventListener("change", function () { if (typeof setPlaybackRate === "function") setPlaybackRate(Number(sel.value)); });
    function sync() {
      sel.value = source.dataset.rate || String(typeof currentPlaybackRate !== "undefined" ? currentPlaybackRate : 1);
      var off = source.hidden || source.classList.contains("is-no-audio-control-hidden");
      wrap.hidden = off;
      sel.disabled = off;
      wrap.classList.toggle("is-active", sel.value !== "1");
    }
    new MutationObserver(sync).observe(source, { attributes: true, attributeFilter: ["data-rate", "hidden", "class"] });
    speedSelects.push({ sel: sel, sync: sync });
    sync();
  }
  function relabelSpeed() {
    speedSelects.forEach(function (s) {
      s.sel.setAttribute("aria-label", L().speed);
      Array.prototype.forEach.call(s.sel.options, function (o) { o.textContent = rateLabel(o.value); });
    });
  }

  /* ---------- legenda delle forme ---------- */
  var legend = null;
  function usedShapes() {
    if (typeof tappe === "undefined" || typeof getStopShape !== "function") return [];
    var used = {};
    tappe.forEach(function (t) { used[getStopShape(t.titolo)] = true; });
    return SHAPE_ORDER.filter(function (s) { return used[s]; });
  }
  function renderLegend() {
    var frame = document.querySelector(".map-stage .map-stage-frame");
    if (!frame || typeof STOP_SHAPE_PATHS === "undefined") return;
    if (!legend) {
      legend = el("div", "tp-map-legend");
      legend.setAttribute("role", "group");
      frame.parentNode.insertBefore(legend, frame.nextSibling);
    }
    legend.setAttribute("aria-label", L().legend);
    legend.innerHTML = '<p class="tp-map-legend-title">' + esc(L().legend) + "</p><ul>" + usedShapes().map(function (s) {
      return '<li><svg viewBox="-20 -20 440 440" aria-hidden="true" focusable="false"><path d="' + STOP_SHAPE_PATHS[s] + '"/></svg><span>' + esc(L()[s]) + "</span></li>";
    }).join("") + "</ul>";
  }

  /* ---------- narratore e voce AI nel player ---------- */
  function renderNarrator() {
    if (!NARRATORE) return;
    var title = document.getElementById("detail-title");
    if (title) {
      var n = document.getElementById("tp-player-narrator");
      if (!n) {
        n = el("p", "tp-player-narrator"); n.id = "tp-player-narrator";
        var row = title.closest(".player-title-row") || title;
        row.parentNode.insertBefore(n, row.nextSibling);
      }
      n.innerHTML = '<span class="tp-narr-name">' + esc(fill(L().narr, { n: NARRATORE })) + '</span> · <a href="' + PRIVACY + '#voci-ai" target="_blank" rel="noopener">' + esc(L().ai) + "</a>";
    }
    var intro = document.getElementById("intro-lead-text");
    if (intro && intro.parentNode) {
      var h = document.getElementById("tp-intro-ai");
      if (!h) { h = el("p", "tp-intro-ai"); h.id = "tp-intro-ai"; var block = intro.closest(".intro-quote-block") || intro.parentNode; block.parentNode.insertBefore(h, block.nextSibling); }
      h.textContent = fill(L().aiFull, { n: NARRATORE });
    }
  }

  /* ---------- piè di pagina ---------- */
  function renderFooter() {
    var f = document.getElementById("tp-site-footer");
    if (!f) {
      f = el("footer", "tp-site-footer");
      f.id = "tp-site-footer";
      var main = document.getElementById("main-content");
      if (!main) return;
      main.parentNode.insertBefore(f, main.nextSibling);
    }
    var l = L();
    f.innerHTML =
      (COMUNE ? "<p>" + esc(fill(l.made, { c: COMUNE })) + (NARRATORE ? " " + esc(fill(l.aiFull, { n: NARRATORE })) : "") + "</p>" : "") +
      '<p>' + esc(l.by) + " " + esc("Pietro Balestri") + ", " + esc(l.role) + "<br>" + esc(TITOLARE.replace("Pietro Balestri · ", "")) + "</p>" +
      '<p><a href="' + PRIVACY + '" target="_blank" rel="noopener">' + esc(l.privacy) + "</a></p>";
  }

  function applyLang() { relabelSpeed(); renderLegend(); renderNarrator(); renderFooter(); }

  function start() {
    buildSpeed("mini-player-duration-total", "mini-player-speed-button", "tp-speed--mini");
    buildSpeed("player-duration-total", "player-speed-button", "tp-speed--full");
    applyLang();
    new MutationObserver(applyLang).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
