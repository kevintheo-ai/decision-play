/* Way "In the Car": one piece per item. If there is audio, the page plays it (the next button skips).
   Without audio it shows the script: exactly what the voice would say. */
(function () {
  const A = window.A;
  const esc = A.esc;
  /* Round to whole seconds first, then divide: otherwise 59.7 s turns into "0:60". */
  const time = (s) => {
    const t = Math.round(s);
    return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  };

  const CSS = `
.car-wrap{min-height:100%;background:#12181B;color:#EDF1EF;padding:clamp(22px,4vh,44px) clamp(16px,4vw,44px) 70px}
.car-h{font-size:clamp(34px,5vw,54px);line-height:1.05;margin:0 0 8px;font-weight:700;letter-spacing:-.02em}
.car-sub{font-size:18px;color:#B8C4C0;margin:0 0 26px;max-width:58ch}
.car-player{background:#1E282D;border-radius:14px;padding:18px 20px;margin:0 0 22px;max-width:760px}
.car-now{font-size:15px;color:#B8C4C0;margin:0}
.car-title{font-size:clamp(25px,3.6vw,38px);font-weight:700;margin:4px 0 12px;line-height:1.15}
.car-keys{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.car-keys button{height:58px;min-width:96px;padding:0 20px;border-radius:10px;border:0;background:#2C383E;color:#fff;font-size:19px;font-weight:600}
.car-keys button.car-big{background:#E8B25C;color:#1c1608;min-width:150px}
.car-bar{height:6px;background:rgba(255,255,255,.14);border-radius:3px;margin-top:14px;overflow:hidden}
.car-bar i{display:block;height:100%;width:0;background:#E8B25C}
.car-info{font-size:15px;color:#B8C4C0;margin:10px 0 0}
.car-list{list-style:none;margin:0 0 30px;padding:0;max-width:760px}
.car-list li{display:flex;gap:12px;align-items:center;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.09);flex-wrap:wrap}
.car-list li.on{background:rgba(232,178,92,.12);border-radius:8px}
.car-list button.car-row{flex:1 1 220px;text-align:left;background:none;border:0;color:inherit;padding:0;font-size:17px;min-width:0}
.car-dur{font-size:14px;color:#9AA7A3;font-variant-numeric:tabular-nums}
.car-ans{display:flex;flex-wrap:wrap;gap:6px}
.car-ans button{border:1px solid rgba(255,255,255,.28);background:none;color:#fff;border-radius:6px;padding:3px 10px;font-size:14px}
.car-ans button[aria-pressed=true]{background:#5ECFA0;color:#12201A;border-color:#5ECFA0}
.car-box{background:#1E282D;border-radius:14px;padding:18px 20px;max-width:760px;margin:0 0 22px}
.car-box h3{margin:0 0 8px;font-size:20px}
.car-box p{margin:0 0 8px;font-size:16px;color:#D5DDD9}
.car-box p:last-child{margin-bottom:0}
.car-book{list-style:none;margin:0 0 30px;padding:0;max-width:760px}
.car-piece{padding:14px 0;border-bottom:1px solid rgba(255,255,255,.09)}
.car-piece h3{margin:0 0 6px;font-size:18px}
.car-part{margin:0 0 6px;font-size:16.5px;line-height:1.5;color:#E3E9E6}
.car-part.b{padding-left:12px;border-left:3px solid #E8B25C;color:#F3DDB4}
.car-piece .car-ans{margin-top:8px}
.car-end{max-width:760px}
`;

  function answerButtons(p) {
    return '<span class="car-ans" role="group" aria-label="Your answer to: ' + esc(p.short) + '">'
      + A.answers(p).map(([w, t]) => '<button type="button" data-id="' + esc(p.id) + '" data-w="' + esc(w) + '">' + esc(t) + "</button>").join("") + "</span>";
  }

  function safe() {
    return '<section class="car-box"><h3>Safe on the road</h3>'
      + "<p>Only listen while driving, answer once you have parked. On the AAA distraction scale, listening to an audiobook rates 1.75 out of 5, dictating an email by voice 3.06. After a voice action, the distraction lasts up to 27 seconds.</p>"
      + "<p>Once you have parked, one sentence is enough, spoken or typed, for example: “1 yes, 2 later, 3 no”.</p></section>";
  }

  /* Without audio: read the script. This way you check what the voice will say and can still answer. */
  function scriptView(el) {
    const pieces = A.car.script;
    el.innerHTML = "<style>" + CSS + '</style><div class="car-wrap"><h1 class="car-h">In the Car</h1>'
      + '<p class="car-sub">' + esc(A.car.note || "No audio yet. This is what the voice would say, piece by piece.") + "</p>"
      + '<ol class="car-book"></ol>' + safe() + '<div class="car-end"></div></div>';
    const book = el.querySelector(".car-book");
    pieces.forEach((s) => {
      const li = document.createElement("li");
      li.className = "car-piece";
      const p = s.id ? A.item(s.id) : null;
      li.innerHTML = "<h3>" + esc(s.title) + "</h3>"
        + s.parts.map((t) => '<p class="car-part' + (t.voice === "b" ? " b" : "") + '">' + esc(t.text) + "</p>").join("")
        + (p ? answerButtons(p) : "");
      book.append(li);
    });
  }

  /* With audio: play, the next button skips, every piece makes sense on its own. */
  function player(el) {
    const PIECES = A.car.pieces;
    const total = PIECES.reduce((a, s) => a + (s.duration || 0), 0);
    el.innerHTML = "<style>" + CSS + '</style><div class="car-wrap"><h1 class="car-h">In the Car</h1>'
      + '<p class="car-sub">' + PIECES.length + " pieces to listen to, " + time(total) + " in total." + (A.car.voice ? " Voice: " + esc(A.car.voice) + "." : "") + "</p>"
      + '<div class="car-player"><p class="car-now" id="car-nr">Ready</p><div class="car-title" id="car-title"></div>'
      + '<div class="car-keys"><button type="button" id="car-back">Back</button><button type="button" id="car-play" class="car-big">Play</button><button type="button" id="car-next">Next</button></div>'
      + '<div class="car-bar"><i id="car-progress"></i></div>'
      + '<p class="car-info">The next button on the steering wheel or the keyboard skips to the next piece while the page plays. Test it once while parked.</p></div>'
      + '<ol class="car-list" id="car-list"></ol>' + safe() + '<div class="car-end"></div></div>';

    const $ = (s) => el.querySelector(s);
    const list = $("#car-list");
    PIECES.forEach((s, i) => {
      const li = document.createElement("li");
      const p = s.id ? A.item(s.id) : null;
      li.innerHTML = '<button type="button" class="car-row"></button><span class="car-dur">' + time(s.duration || 0) + "</span>" + (p ? answerButtons(p) : "");
      li.querySelector(".car-row").textContent = s.title;
      li.querySelector(".car-row").onclick = () => play(i, true);
      list.append(li);
    });

    const audio = new Audio();
    audio.preload = "none";
    let now = 0;
    function draw() {
      list.querySelectorAll("li").forEach((li, i) => li.classList.toggle("on", i === now));
      $("#car-title").textContent = PIECES[now].title;
      $("#car-nr").textContent = "Piece " + (now + 1) + " of " + PIECES.length;
      $("#car-play").textContent = audio.paused ? "Play" : "Pause";
    }
    /* A new piece cuts off one that is still starting (AbortError). That is not an error and does not belong at the wheel. */
    const reportError = (e) => { if (!e || e.name !== "AbortError") A.notify("The file could not be played."); };
    function play(i, go) {
      now = Math.max(0, Math.min(PIECES.length - 1, i));
      audio.src = PIECES[now].url;
      if (go) audio.play().catch(reportError);
      draw();
    }
    audio.addEventListener("timeupdate", () => { if (audio.duration) $("#car-progress").style.width = (audio.currentTime / audio.duration) * 100 + "%"; });
    audio.addEventListener("play", draw);
    audio.addEventListener("pause", draw);
    audio.addEventListener("ended", () => {
      if (now < PIECES.length - 1) play(now + 1, true);
      else draw();
    });
    $("#car-play").onclick = () => {
      if (!audio.getAttribute("src")) play(now, true);
      else if (audio.paused) audio.play().catch(reportError);
      else audio.pause();
    };
    /* Next after the last piece stops instead of restarting the skipped piece. */
    const next = () => (now < PIECES.length - 1 ? play(now + 1, true) : audio.pause());
    $("#car-next").onclick = next;
    $("#car-back").onclick = () => play(now - 1, true);

    /* Media keys: buttons on the steering wheel and the keyboard go through this while the page plays. */
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("nexttrack", next);
      navigator.mediaSession.setActionHandler("previoustrack", () => play(now - 1, true));
    }
    /* When you leave the way, the voice stops and the media keys are free again. */
    A.onLeave(() => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if ("mediaSession" in navigator) {
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
      }
    });
    draw();
  }

  A.build.car = function (el) {
    if (A.car.pieces && A.car.pieces.length) player(el);
    else scriptView(el);
    const buttons = () => el.querySelectorAll(".car-ans [data-w]").forEach((b) => b.setAttribute("aria-pressed", String(State.value(b.dataset.id) === b.dataset.w)));
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".car-ans [data-w]");
      if (!b) return;
      State.set(b.dataset.id, State.value(b.dataset.id) === b.dataset.w ? null : b.dataset.w);
    });
    buttons();
    const off = State.on(() => (el.isConnected ? buttons() : off()));
    A.onLeave(off);
    A.end(el.querySelector(".car-end"), "car");
  };
})();
