/* Travel Podcasting · lettura facile e icone dei salti con il segno. Richiede app.js. */
(function () {
  "use strict";
  var T = {
    it: { easy: "Lettura facile", gTitle: "Guida in cammino", gText: "Ti avviso con una notifica quando arrivi a una tappa e ti mostro direzione e distanza.", on: "Attiva", off: "Disattiva", toward: "Verso la tappa {n}", aTitle: "Sei arrivato: {t}", aBody: "Tocca per ascoltare la tappa {n}.", denied: "Per usare la guida attiva posizione e notifiche dalle impostazioni del browser.", north: "Freccia rispetto al nord" },
    en: { easy: "Easy reading", gTitle: "Walking guide", gText: "I'll notify you when you reach a stop and show you the direction and distance.", on: "Turn on", off: "Turn off", toward: "Towards stop {n}", aTitle: "You have arrived: {t}", aBody: "Tap to listen to stop {n}.", denied: "To use the guide, allow location and notifications in your browser settings.", north: "Arrow points relative to north" },
    de: { easy: "Leichtes Lesen", gTitle: "Begleitung unterwegs", gText: "Ich benachrichtige dich, wenn du an einer Station ankommst, und zeige Richtung und Entfernung.", on: "Einschalten", off: "Ausschalten", toward: "Richtung Station {n}", aTitle: "Du bist angekommen: {t}", aBody: "Tippe, um Station {n} zu hören.", denied: "Erlaube Standort und Benachrichtigungen in den Browsereinstellungen.", north: "Pfeil relativ zu Norden" },
    fr: { easy: "Lecture facile", gTitle: "Guide en chemin", gText: "Je vous préviens par une notification quand vous arrivez à une étape et j'indique direction et distance.", on: "Activer", off: "Désactiver", toward: "Vers l'étape {n}", aTitle: "Vous êtes arrivé : {t}", aBody: "Touchez pour écouter l'étape {n}.", denied: "Autorisez la position et les notifications dans les réglages du navigateur.", north: "Flèche par rapport au nord" },
    es: { easy: "Lectura fácil", gTitle: "Guía en ruta", gText: "Te aviso con una notificación cuando llegues a una etapa y te muestro dirección y distancia.", on: "Activar", off: "Desactivar", toward: "Hacia la etapa {n}", aTitle: "Has llegado: {t}", aBody: "Toca para escuchar la etapa {n}.", denied: "Permite la ubicación y las notificaciones en los ajustes del navegador.", north: "Flecha respecto al norte" },
    pt: { easy: "Leitura fácil", gTitle: "Guia a caminho", gText: "Aviso-o com uma notificação quando chegar a uma etapa e mostro direção e distância.", on: "Ativar", off: "Desativar", toward: "Rumo à etapa {n}", aTitle: "Chegou: {t}", aBody: "Toque para ouvir a etapa {n}.", denied: "Permita a localização e as notificações nas definições do navegador.", north: "Seta em relação ao norte" },
    ru: { easy: "Простое чтение", gTitle: "Гид в пути", gText: "Я пришлю уведомление, когда вы дойдёте до остановки, и покажу направление и расстояние.", on: "Включить", off: "Выключить", toward: "К остановке {n}", aTitle: "Вы пришли: {t}", aBody: "Нажмите, чтобы прослушать остановку {n}.", denied: "Разрешите геолокацию и уведомления в настройках браузера.", north: "Стрелка относительно севера" },
    zh: { easy: "轻松阅读", gTitle: "沿途向导", gText: "到达站点时会通知你，并显示方向和距离。", on: "开启", off: "关闭", toward: "前往第{n}站", aTitle: "你已到达：{t}", aBody: "点按收听第{n}站。", denied: "请在浏览器设置中允许定位和通知。", north: "箭头相对于正北" },
    ar: { easy: "قراءة ميسّرة", gTitle: "مرشد الطريق", gText: "سأنبّهك بإشعار عند وصولك إلى محطة وأعرض لك الاتجاه والمسافة.", on: "تشغيل", off: "إيقاف", toward: "نحو المحطة {n}", aTitle: "لقد وصلت: {t}", aBody: "اضغط للاستماع إلى المحطة {n}.", denied: "اسمح بالموقع والإشعارات من إعدادات المتصفح.", north: "السهم بالنسبة للشمال" }
  };
  function code() { return String((typeof currentLanguage !== "undefined" ? currentLanguage : document.documentElement.lang) || "it").toLowerCase(); }
  function L() { return T[code()] || T.it; }
  function f(s, o) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---- icone nel brand: sostituisce le icone Material con quelle del segno ---- */
  var BRAND_ICONS = ["help", "language", "expand_more", "my_location", "location_on", "fullscreen", "fullscreen_exit", "open_in_full", "map", "headphones", "article", "swap_horiz", "photo", "close", "arrow_back", "arrow_forward"];
  function tagIcon(s) {
    var name = s.textContent.trim();
    s.setAttribute("data-icon", name);
    var on = BRAND_ICONS.indexOf(name) >= 0 && !s.classList.contains("playback-icon");
    s.classList.toggle("brand-icon", on);
    if (on && !s.style.getPropertyValue("--ic-size")) {
      var fs = parseFloat(getComputedStyle(s).fontSize);
      if (fs > 0) s.style.setProperty("--ic-size", fs + "px");
    }
  }
  function watchIcons() {
    document.querySelectorAll(".material-symbols-rounded").forEach(function (s) {
      // la dimensione si legge prima di nascondere il testo
      if (!s.classList.contains("brand-icon")) {
        var name = s.textContent.trim();
        if (BRAND_ICONS.indexOf(name) >= 0 && !s.classList.contains("playback-icon")) {
          var fs = parseFloat(getComputedStyle(s).fontSize);
          if (fs > 0) s.style.setProperty("--ic-size", fs + "px");
        }
      }
      tagIcon(s);
      new MutationObserver(function () { tagIcon(s); }).observe(s, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---- lettura facile: tre livelli di testo (100%, 118%, 136%) ---- */
  var LEVELS = ["A", "A+", "A++"];
  var NAMES = {
    it: "Dimensione del testo: {l}", en: "Text size: {l}", de: "Textgröße: {l}", fr: "Taille du texte : {l}", es: "Tamaño del texto: {l}", pt: "Tamanho do texto: {l}", ru: "Размер текста: {l}", zh: "文字大小：{l}", ar: "حجم النص: {l}"
  };
  var saved = store("tp-text");
  var level = saved !== null ? Math.max(0, Math.min(2, Number(saved) || 0)) : (store("tp-easy") === "1" ? 1 : (store("tp-easy") === "0" ? 0 : (window.matchMedia("(max-width: 640px)").matches ? 1 : 0)));
  function applyEasy() {
    var root = document.documentElement;
    root.classList.toggle("easy-read", level > 0);
    root.classList.toggle("text-1", level === 1);
    root.classList.toggle("text-2", level === 2);
    var b = document.getElementById("easy-read-button");
    if (b) {
      var name = (NAMES[code()] || NAMES.it).replace("{l}", LEVELS[level]);
      b.setAttribute("aria-label", name); b.title = name;
      b.setAttribute("aria-pressed", level > 0 ? "true" : "false");
      b.firstChild.textContent = LEVELS[level];
    }
  }
  function addEasyButton() {
    var box = document.querySelector(".header-actions");
    if (!box || document.getElementById("easy-read-button")) return;
    var b = document.createElement("button");
    b.type = "button"; b.id = "easy-read-button"; b.className = "easy-read-button tp-icon-button";
    b.innerHTML = '<span aria-hidden="true">A+</span>';
    b.addEventListener("click", function () { level = (level + 1) % 3; store("tp-text", String(level)); applyEasy(); });
    box.insertBefore(b, box.firstChild);
    applyEasy();
  }

  /* ---- solo audio: schermata nera con comandi grandi, per camminare con lo schermo spento ---- */
  var TS = {
    it: { label: "Solo audio", hint: "Puoi bloccare lo schermo: l'audio continua e i comandi restano sul blocco schermo.", stop: "Tappa {n}", close: "Chiudi", back: "Indietro di 10 secondi", fwd: "Avanti di 10 secondi", prev: "Tappa precedente", next: "Tappa successiva", play: "Riproduci", pause: "Pausa", speed: "Velocità", pos: "Posizione" },
    en: { label: "Audio only", hint: "You can lock your screen: audio keeps playing and the controls stay on the lock screen.", stop: "Stop {n}", close: "Close", back: "Back 10 seconds", fwd: "Forward 10 seconds", prev: "Previous stop", next: "Next stop", play: "Play", pause: "Pause", speed: "Speed", pos: "Position" },
    de: { label: "Nur Audio", hint: "Du kannst den Bildschirm sperren: Das Audio läuft weiter, die Steuerung bleibt auf dem Sperrbildschirm.", stop: "Station {n}", close: "Schließen", back: "10 Sekunden zurück", fwd: "10 Sekunden vor", prev: "Vorherige Station", next: "Nächste Station", play: "Abspielen", pause: "Pause", speed: "Geschwindigkeit", pos: "Position" },
    fr: { label: "Audio seul", hint: "Vous pouvez verrouiller l'écran : l'audio continue et les commandes restent sur l'écran de verrouillage.", stop: "Étape {n}", close: "Fermer", back: "Reculer de 10 secondes", fwd: "Avancer de 10 secondes", prev: "Étape précédente", next: "Étape suivante", play: "Lecture", pause: "Pause", speed: "Vitesse", pos: "Position" },
    es: { label: "Solo audio", hint: "Puedes bloquear la pantalla: el audio continúa y los controles quedan en la pantalla de bloqueo.", stop: "Etapa {n}", close: "Cerrar", back: "Retroceder 10 segundos", fwd: "Avanzar 10 segundos", prev: "Etapa anterior", next: "Etapa siguiente", play: "Reproducir", pause: "Pausa", speed: "Velocidad", pos: "Posición" },
    pt: { label: "Só áudio", hint: "Pode bloquear o ecrã: o áudio continua e os controlos ficam no ecrã de bloqueio.", stop: "Etapa {n}", close: "Fechar", back: "Recuar 10 segundos", fwd: "Avançar 10 segundos", prev: "Etapa anterior", next: "Etapa seguinte", play: "Reproduzir", pause: "Pausa", speed: "Velocidade", pos: "Posição" },
    ru: { label: "Только аудио", hint: "Можно заблокировать экран: звук продолжится, а управление останется на экране блокировки.", stop: "Остановка {n}", close: "Закрыть", back: "Назад на 10 секунд", fwd: "Вперёд на 10 секунд", prev: "Предыдущая остановка", next: "Следующая остановка", play: "Воспроизвести", pause: "Пауза", speed: "Скорость", pos: "Позиция" },
    zh: { label: "纯音频", hint: "你可以锁屏：音频会继续播放，控制按钮保留在锁屏界面。", stop: "第{n}站", close: "关闭", back: "后退10秒", fwd: "前进10秒", prev: "上一站", next: "下一站", play: "播放", pause: "暂停", speed: "播放速度", pos: "播放位置" },
    ar: { label: "صوت فقط", hint: "يمكنكم قفل الشاشة: يستمر الصوت وتبقى أزرار التحكم على شاشة القفل.", stop: "المحطة {n}", close: "إغلاق", back: "رجوع 10 ثوانٍ", fwd: "تقديم 10 ثوانٍ", prev: "المحطة السابقة", next: "المحطة التالية", play: "تشغيل", pause: "إيقاف مؤقت", speed: "السرعة", pos: "موضع المقطع" }
  };
  function code() { return String((typeof currentLanguage !== "undefined" ? currentLanguage : document.documentElement.lang) || "it").toLowerCase(); }
  function SL() { return TS[code()] || TS.it; }
  var PAIR = "M52 62 L30 88 Q22 100 30 112 L52 138 M82 62 L60 88 Q52 100 60 112 L82 138";
  var ST = 'fill="none" stroke="currentColor" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"';
  var SVG = {
    prev: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M32 60V140" ' + ST + '/><path transform="translate(46 0)" d="' + PAIR + '" ' + ST + '/></svg>',
    next: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M168 60V140" ' + ST + '/><path transform="matrix(-1 0 0 1 154 0)" d="' + PAIR + '" ' + ST + '/></svg>',
    back: '<svg viewBox="0 0 200 200" aria-hidden="true"><g transform="translate(6 24) scale(.82)"><path d="' + PAIR + '" ' + ST + '/></g><path d="M120 80 L138 66 V136" ' + ST + '/><rect x="152" y="64" width="34" height="72" rx="17" ' + ST + '/></svg>',
    fwd: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M20 80 L38 66 V136" ' + ST + '/><rect x="52" y="64" width="34" height="72" rx="17" ' + ST + '/><g transform="translate(194 24) scale(-.82 .82)"><path d="' + PAIR + '" ' + ST + '/></g></svg>',
    play: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M74 54 L150 100 L74 146 Z" fill="currentColor" stroke="currentColor" stroke-width="16" stroke-linejoin="round"/></svg>',
    pause: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M74 58V142M126 58V142" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M54 54 L146 146 M146 54 L54 146" ' + ST + '/></svg>',
    moon: '<svg viewBox="0 0 200 200" aria-hidden="true"><path d="M138 130 A62 62 0 1 1 90 40 A50 50 0 0 0 138 130 Z" ' + ST + '/></svg>'
  };
  function fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }
  function $(id) { return document.getElementById(id); }
  function click(id) { var b = $(id); if (b) b.click(); }

  var solo = null, soloTimer = null, soloFocusBefore = null;
  function soloBuild() {
    if (solo) return solo;
    solo = document.createElement("div");
    solo.className = "solo-audio";
    solo.setAttribute("role", "dialog");
    solo.setAttribute("aria-modal", "true");
    solo.hidden = true;
    solo.innerHTML =
      '<button type="button" class="solo-close" data-act="close">' + SVG.close + "</button>" +
      '<p class="solo-stop"></p><h2 class="solo-title"></h2>' +
      '<div class="solo-time"><span class="solo-cur">00:00</span><input class="solo-seek" type="range" min="0" max="1000" step="1" value="0"><span class="solo-dur">00:00</span></div>' +
      '<div class="solo-controls">' +
      '<button type="button" class="solo-btn" data-act="prev">' + SVG.prev + "</button>" +
      '<button type="button" class="solo-btn" data-act="back">' + SVG.back + "</button>" +
      '<button type="button" class="solo-btn solo-play" data-act="play"></button>' +
      '<button type="button" class="solo-btn" data-act="fwd">' + SVG.fwd + "</button>" +
      '<button type="button" class="solo-btn" data-act="next">' + SVG.next + "</button></div>" +
      '<button type="button" class="solo-speed" data-act="speed">×1</button>' +
      '<p class="solo-hint"></p>';
    document.body.appendChild(solo);
    solo.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var a = b.dataset.act;
      if (a === "close") soloClose();
      else if (a === "play") click("mini-player-toggle");
      else if (a === "prev") click("player-previous-track");
      else if (a === "next") click("player-next-track");
      else if (a === "back") click("player-prev-button");
      else if (a === "fwd") click("player-next-button");
      else if (a === "speed") click("mini-player-speed-button");
      setTimeout(soloUpdate, 120);
    });
    solo.querySelector(".solo-seek").addEventListener("input", function (e) {
      var a = typeof currentAudio !== "undefined" ? currentAudio : null;
      if (a && isFinite(a.duration) && a.duration > 0) a.currentTime = (Number(e.target.value) / 1000) * a.duration;
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && solo && !solo.hidden) soloClose(); });
    return solo;
  }
  function soloUpdate() {
    if (!solo || solo.hidden) return;
    var s = SL(), a = typeof currentAudio !== "undefined" ? currentAudio : null;
    var tr = typeof isTransitionAudioActive !== "undefined" && isTransitionAudioActive;
    var n = typeof activeStopNumber !== "undefined" ? activeStopNumber : null;
    var t = n && typeof tappe !== "undefined" ? tappe.find(function (x) { return x.numero === n; }) : null;
    solo.querySelector(".solo-stop").textContent = n ? s.stop.replace("{n}", n) : "";
    solo.querySelector(".solo-title").textContent = tr && typeof getInterludeTitle === "function" ? getInterludeTitle() : (t && typeof getStopTitle === "function" ? getStopTitle(t) : "");
    var dur = a && isFinite(a.duration) ? a.duration : 0, cur = a ? a.currentTime : 0;
    solo.querySelector(".solo-cur").textContent = fmtTime(cur);
    solo.querySelector(".solo-dur").textContent = fmtTime(dur);
    var seek = solo.querySelector(".solo-seek");
    if (document.activeElement !== seek) seek.value = dur ? String(Math.round(cur / dur * 1000)) : "0";
    seek.disabled = !dur || tr;
    var playing = a && !a.paused && !a.ended;
    var pb = solo.querySelector(".solo-play");
    var want = playing ? "pause" : "play";
    if (pb.dataset.state !== want + code()) { pb.dataset.state = want + code(); pb.innerHTML = SVG[want]; pb.setAttribute("aria-label", playing ? s.pause : s.play); }
    var lab = $("mini-player-speed-label"); solo.querySelector(".solo-speed").textContent = lab ? lab.textContent : "×1";
    solo.querySelector(".solo-hint").textContent = s.hint;
    var set = function (act, txt) { var b = solo.querySelector('[data-act="' + act + '"]'); if (b) b.setAttribute("aria-label", txt); };
    set("close", s.close); set("prev", s.prev); set("next", s.next); set("back", s.back); set("fwd", s.fwd);
    solo.querySelector(".solo-speed").setAttribute("aria-label", s.speed + ": " + (lab ? lab.textContent : "×1"));
    seek.setAttribute("aria-label", s.pos);
  }
  function soloOpen() {
    soloBuild();
    soloFocusBefore = document.activeElement;
    solo.hidden = false;
    document.documentElement.classList.add("has-solo-audio");
    soloUpdate();
    clearInterval(soloTimer); soloTimer = setInterval(soloUpdate, 400);
    var p = solo.querySelector(".solo-play"); if (p) p.focus();
  }
  function soloClose() {
    if (!solo) return;
    solo.hidden = true;
    document.documentElement.classList.remove("has-solo-audio");
    clearInterval(soloTimer);
    if (soloFocusBefore && soloFocusBefore.focus) soloFocusBefore.focus();
  }
  function addSoloButtons() {
    var lbl = SL().label, ob = $("solo-audio-open");
    if (ob) { ob.setAttribute("aria-label", lbl); ob.title = lbl; }
  }

  /* ---- comandi del blocco schermo: posizione e salto alla posizione scelta ---- */
  function mediaExtras() {
    if (!("mediaSession" in navigator)) return;
    try { navigator.mediaSession.setActionHandler("seekto", function (d) { var a = typeof currentAudio !== "undefined" ? currentAudio : null; if (a && d && d.seekTime != null && !(typeof isTransitionAudioActive !== "undefined" && isTransitionAudioActive)) a.currentTime = d.seekTime; }); } catch (e) { /* non supportato */ }
    try { navigator.mediaSession.setActionHandler("stop", function () { var a = typeof currentAudio !== "undefined" ? currentAudio : null; if (a) a.pause(); }); } catch (e) { /* non supportato */ }
    setInterval(function () {
      var a = typeof currentAudio !== "undefined" ? currentAudio : null;
      if (!a || !isFinite(a.duration) || a.duration <= 0 || !navigator.mediaSession.setPositionState) return;
      try { navigator.mediaSession.setPositionState({ duration: a.duration, playbackRate: a.playbackRate || 1, position: Math.min(a.currentTime, a.duration) }); } catch (e) { /* ignora */ }
    }, 1000);
  }

  function start() {
    watchIcons();
    addEasyButton();
    addSoloButtons();
    mediaExtras();
    new MutationObserver(function () { applyEasy(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    new MutationObserver(function () { addSoloButtons(); soloUpdate(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 50); });
  else setTimeout(start, 50);
})();
