/* Frame: head bar with the ways, overview with all items, closing of every way.
   Runs as the last script, after every way has registered its A.build[id]. */
(function () {
  const A = window.A;
  const $ = (id) => document.getElementById(id);
  const esc = A.esc;
  const TARGET = "into your session “" + A.session + "”";
  const COPIED = "Text copied. Now paste it " + TARGET + ".";
  const ways = A.WAYS.filter((w) => A.ways.includes(w.id) && A.build[w.id]);
  let active = null;

  document.title = A.title;
  $("head-title").textContent = A.title;
  $("band").textContent = A.about;
  /* The head bar sticks to the top. Ways that pin something to the top themselves count with its height. */
  new ResizeObserver(() => document.documentElement.style.setProperty("--a-head", $("head").offsetHeight + "px")).observe($("head"));

  A.notify = function (text) {
    const t = $("toast");
    t.textContent = text;
    t.classList.add("on");
    clearTimeout(A.notify.z);
    A.notify.z = setTimeout(() => t.classList.remove("on"), 2400);
  };

  /* Closing of every way: the one text for the chat, and how the way felt. */
  A.end = function (el, way) {
    el.classList.add("a-end");
    function draw() {
      el.innerHTML = "<div>This is your answer so far:</div><pre></pre>"
        + '<div class="a-end-buttons"><button type="button" data-k>Copy text</button></div>'
        + (way ? '<div class="a-end-buttons a-end-rating"><span>How was this way?</span>'
          + ["pleasant", "okay", "annoying"].map((r) => '<button type="button" data-r="' + r + '" aria-pressed="' + (State.wayRating(way) === r) + '">' + r + "</button>").join("")
          + "</div>" : "")
        + "<small>Only marked, it counts once it is in the chat. Paste the text " + esc(TARGET) + " or say it there.</small>";
      el.querySelector("pre").textContent = State.text();
      el.querySelector("[data-k]").onclick = async () => A.notify((await State.copy()) ? COPIED : "Copying did not work. Select the text above and copy it.");
      el.querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => {
        State.rateWay(way, State.wayRating(way) === b.dataset.r ? null : b.dataset.r);
        draw();
      }));
    }
    draw();
    /* The text stays current, even while answers change further up. */
    if (el._aOff) el._aOff();
    el._aOff = State.on(() => {
      if (!el.isConnected) return el._aOff();
      el.querySelector("pre").textContent = State.text();
    });
  };

  /* A way registers here what has to stop when you leave it (for example playback). */
  let cleanup = [];
  A.onLeave = (f) => cleanup.push(f);
  function leave() {
    cleanup.splice(0).forEach((f) => {
      try { f(); } catch (e) { /* an error while cleaning up must not block the switch */ }
    });
  }

  function bar() {
    const button = (id, text) => '<button type="button" data-way="' + id + '"' + (active === id ? ' aria-current="page"' : "") + ">" + esc(text) + "</button>";
    $("head-ways").innerHTML = button("", "Overview") + ways.map((w) => button(w.id, w.title)).join("");
    $("head-ways").querySelectorAll("[data-way]").forEach((b) => (b.onclick = () => (b.dataset.way ? show(b.dataset.way) : overview())));
    $("head-count").textContent = State.count() + " of " + A.items.length + " answered";
  }

  function show(id) {
    leave();
    active = id;
    if (location.hash.slice(1) !== id) location.hash = id;
    $("band").hidden = false;
    const stage = $("stage");
    stage.replaceChildren();
    const b = document.createElement("div");
    stage.append(b);
    window.scrollTo(0, 0);
    try {
      A.build[id](b);
    } catch (e) {
      b.className = "a-error";
      b.textContent = "This way has an error: " + e.message;
    }
    bar();
  }

  function itemRow(p) {
    const li = document.createElement("li");
    li.className = "a-item";
    /* Opened up, this shows everything the content knows about the item. The proposal comes last, it should not steer. */
    const more = [
      ["You know this", p.familiar],
      ["Today", p.now],
      ["After", p.after],
      ["For", p.why],
      ["What could go wrong", p.risk],
      ["What you might regret", p.regret],
      ["Evidence", p.evidence],
      ["Cost", A.hasCost(p) ? "Estimated " + A.cost(p.cost) + "." + (p.costNote ? " " + p.costNote : "") : p.costNote],
      ["You said before", p.conflict],
      ["If yes", p.ifYes],
      ["If no", p.ifNo],
      ["Against my proposal", p.counter],
      ["My proposal", A.label(p, p.proposal) + ". " + p.proposalWhy],
    ].filter(([, t]) => t);
    li.innerHTML = '<div class="a-item-text"><h3 id="a-p-' + esc(p.id) + '"><span class="a-nr">' + p.nr + "</span>" + esc(p.short) + "</h3>"
      + "<p><strong>" + esc(p.title) + ".</strong> " + esc(p.about) + "</p>"
      + "<details><summary>More, and my proposal</summary>"
      + more.map(([title, t]) => "<p><strong>" + esc(title) + ":</strong> " + esc(t) + "</p>").join("") + "</details></div>"
      + '<div class="a-choice" role="group" aria-labelledby="a-p-' + esc(p.id) + '">'
      + A.answers(p).map(([w, t]) => '<button type="button" data-w="' + esc(w) + '">' + esc(t) + "</button>").join("") + "</div>";
    li.querySelectorAll("[data-w]").forEach((b) => (b.onclick = () => State.set(p.id, State.value(p.id) === b.dataset.w ? null : b.dataset.w)));
    return li;
  }

  function overview() {
    leave();
    active = "";
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    $("band").hidden = true;
    const stage = $("stage");
    const s = document.createElement("div");
    s.className = "a-start";
    const n = A.items.length;
    s.innerHTML = "<h1>" + esc(A.title) + "</h1>"
      + '<p class="a-lead">' + esc(A.about) + "</p>"
      + "<p>" + (n === 1 ? "1 item is" : n + " items are") + " open here. Pick the way that suits you right now. The content is the same everywhere, and your answers travel with you from way to way.</p>"
      + (ways.length ? '<div class="a-ways">' + ways.map((w) => '<button type="button" class="a-way" data-way="' + w.id + '"><span class="a-way-title">' + esc(w.title)
        + '</span><span class="a-way-when">' + esc(w.when) + '</span><span class="a-way-does">' + esc(w.does) + "</span></button>").join("") + "</div>" : "")
      + "<h2>All items at a glance</h2>"
      + '<ol class="a-items"></ol>'
      + (A.committed && A.committed.length ? "<details class=\"a-committed\"><summary>Coming anyway, already promised</summary><ul>"
        + A.committed.map((z) => "<li><strong>" + esc(z.name) + ".</strong> " + esc(z.text) + (z.cost && A.unit ? " Estimated " + esc(A.cost(z.cost)) + "." : "") + "</li>").join("") + "</ul></details>" : "")
      + '<section class="a-start-end"></section>'
      + '<p class="a-small">As of ' + esc(A.date) + ". All costs are estimates. Clicks only mark things, what counts is what you paste " + esc(TARGET) + ". Your answers never leave this computer.</p>";
    const ol = s.querySelector(".a-items");
    A.items.forEach((p) => ol.append(itemRow(p)));
    s.querySelectorAll(".a-way").forEach((b) => (b.onclick = () => show(b.dataset.way)));
    stage.replaceChildren(s);
    A.end(s.querySelector(".a-start-end"), null);
    const buttons = () => s.querySelectorAll(".a-item [data-w]").forEach((b) => {
      const id = b.closest(".a-item").querySelector("h3").id.slice(4);
      b.setAttribute("aria-pressed", String(State.value(id) === b.dataset.w));
    });
    buttons();
    const off = State.on(() => (s.isConnected ? buttons() : off()));
    window.scrollTo(0, 0);
    bar();
  }

  $("head-copy").onclick = async () => A.notify((await State.copy()) ? COPIED : "Copying did not work.");
  State.on(() => { $("head-count").textContent = State.count() + " of " + A.items.length + " answered"; });
  window.addEventListener("hashchange", () => {
    const id = location.hash.slice(1);
    if (id && id !== active && ways.some((w) => w.id === id)) show(id);
    else if (!id && active) overview();
  });
  const id = location.hash.slice(1) || A.start || "";
  if (id && ways.some((w) => w.id === id)) show(id);
  else overview();
})();
