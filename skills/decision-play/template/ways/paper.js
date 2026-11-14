/* Way "Tomorrow's Paper": a kiosk with 2 or 3 editions from the future, plus "Nothing New" if wanted.
   Facts only from the content. The stories tell without new numbers and are marked as made up.
   Everything printed is set in Vollkorn, everything you click in the system font: paper and app stay apart. */
(function () {
  const A = window.A;
  const esc = A.esc;
  const TILT = ["-.8deg", ".5deg", "-.4deg"];

  A.build.paper = function (el) {
    const Z = A.paper;
    /* tilt only comes from the template and lands raw in a style attribute, so it is set last. */
    const EDITIONS = Z.editions.map((a, i) => Object.assign({ choices: {} }, a, { tilt: TILT[i % TILT.length] }));
    /* The defaults of "Nothing New" come last, so no field from the content overrides them. */
    const NOTHING = Z.nothing ? Object.assign({}, Z.nothing, { id: "nothing", yes: [], choices: {} }) : null;
    const WITH_COST = !!A.unit;
    const committedSum = (A.committed || []).reduce((s, z) => s + (z.cost || 0), 0);

    const sum = (ids) => ids.reduce((s, id) => s + (A.hasCost(A.item(id)) ? A.item(id).cost : 0), 0);
    /* What an edition means for every item: in it is yes, a picked option counts, else no where the proposal was no, else later. */
    const target = (a, p) => a.choices[p.id] || (a.yes.includes(p.id) ? "yes" : p.proposal === "no" ? "no" : "later");
    const matches = (a) => A.items.every((p) => State.value(p.id) === target(a, p));
    const inside = (a) => a.yes.map((id) => A.item(id).short)
      .concat(Object.entries(a.choices).filter(([, w]) => w !== "later").map(([id, w]) => A.item(id).short + ": " + A.word(A.item(id), w)));
    const part = (tag, cls, html) => {
      const e = document.createElement(tag);
      e.className = cls;
      e.innerHTML = html;
      return e;
    };

    const style = document.createElement("style");
    style.textContent = `
@import url("https://fonts.googleapis.com/css2?family=Vollkorn:ital,wght@0,400..900;1,400..900&display=swap");
.paper-stage{--paper-grey:#C7CAC4;--paper-yellow:#FFCC00;--paper-chalk:#F2F4F1;--paper-print:Vollkorn,"Iowan Old Style",Georgia,serif;--paper-app:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif;container:paper/inline-size;padding:20px clamp(16px,3vw,34px) 72px;font-family:var(--paper-print);font-size:17px;line-height:1.5;font-variant-numeric:lining-nums}
.paper-stage h1,.paper-stage h2,.paper-stage p,.paper-stage ul,.paper-stage figure,.paper-stage table{margin:0;padding:0}
.paper-texture{color:#000;background-color:var(--paper-grey);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E")}

.paper-kiosk{max-width:1120px;margin:0 auto}
.paper-board{margin-bottom:22px;color:var(--paper-chalk)}
.paper-board h1{font-size:clamp(34px,5.4cqw,54px);line-height:1.02;font-weight:900;letter-spacing:-.012em}
.paper-board p{max-width:72ch;margin-top:10px;font-size:18px;line-height:1.42}
.paper-shelf{display:grid;grid-template-columns:repeat(var(--paper-n,3),minmax(0,1fr))}
.paper-slot{position:relative;display:flex;flex-direction:column;padding:0 9px}
.paper-grab{position:absolute;inset:0;z-index:2;width:100%;background:none;border:0;padding:0;cursor:pointer}
.paper-grab:focus-visible{top:-16px;outline:none;box-shadow:inset 0 0 0 3px var(--paper-yellow),inset 0 0 0 6px #000}
.paper-sheet{container-type:inline-size;flex:1;display:flex;flex-direction:column;padding:14px 12px 42px;transform:rotate(var(--paper-tilt,0deg));transform-origin:50% 100%;box-shadow:4px 5px 0 rgba(0,0,0,.42)}
.paper-grab:hover~.paper-sheet,.paper-grab:focus-visible~.paper-sheet{transform:translateY(-12px)}
@media (prefers-reduced-motion:no-preference){.paper-sheet{transition:transform .18s ease-out}}
.paper-lip{position:relative;z-index:1;margin:-30px -9px 0;min-height:90px;padding:12px 18px 14px;background:#000;color:var(--paper-chalk)}
.paper-price{display:block;font-size:21px;line-height:1.15;font-weight:800}
.paper-inside{display:block;margin-top:4px;font-size:14px;line-height:1.3}
.paper-taken{position:absolute;right:20px;bottom:54px;padding:2px 10px;background:var(--paper-yellow);color:#000;font-size:15px;line-height:1.3;font-weight:800;transform:rotate(-3deg);box-shadow:0 2px 0 rgba(0,0,0,.4)}
.paper-note .paper-taken{right:14px;bottom:12px}

.paper-masthead{display:grid;grid-template-columns:1fr auto;align-items:baseline;row-gap:2px}
.paper-prefix{font-style:italic;font-weight:700;font-size:6.4cqw;line-height:1}
.paper-name{grid-column:1/-1;grid-row:2;font-weight:900;font-size:calc(150cqw / var(--paper-nl,7));line-height:.9;letter-spacing:-.02em;overflow-wrap:anywhere}
.paper-edition{grid-column:2;grid-row:1;font-weight:700;font-size:5.2cqw;line-height:1}
.paper-place{grid-column:1/-1;margin-top:7px;padding-top:3px;border-top:4px solid #000;font-size:4.8cqw;line-height:1.25}
.paper-band{margin:9px -19px 12px;padding:5px 14px;background:var(--paper-yellow);color:#000;text-align:center;font-weight:700;font-size:5.4cqw;line-height:1.2;box-shadow:0 2px 0 rgba(0,0,0,.4)}
.paper-headline{font-weight:900;font-size:12.4cqw;line-height:1.02;letter-spacing:-.012em;text-wrap:balance;overflow-wrap:anywhere}
.paper-lede{margin-top:8px;font-size:5.5cqw;line-height:1.3;font-weight:500;font-style:italic}
.paper-photo{position:relative;flex:1 0 176px;margin-top:11px;overflow:hidden;background:#000;filter:grayscale(1) contrast(1.15)}
.paper-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.paper-photo::after{content:"";position:absolute;inset:0;background:radial-gradient(circle,rgba(199,202,196,.5) 0 .75px,transparent 1.05px) 0 0/3px 3px}

.paper-slot-small{max-width:760px;margin:22px auto 0}
.paper-slot-small .paper-note{flex:none;display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 20px;align-items:center;padding:13px 18px 14px}
.paper-note h2{grid-row:1/3;font-size:32px;font-weight:900;line-height:1;letter-spacing:-.01em;max-width:6em}
.paper-note p{font-size:16px;line-height:1.32}
.paper-note .paper-price{font-size:16px;font-weight:700;line-height:1.3}
.paper-desk{margin-top:22px;text-align:center}
.paper-single{color:var(--paper-chalk);background:none;border:0;padding:8px 4px;font:15px/1.3 var(--paper-app);text-decoration:underline;text-underline-offset:3px;cursor:pointer}

.paper-bar{max-width:1000px;margin:0 auto 14px}
.paper-back{color:inherit;background:none;border:2px solid currentColor;padding:7px 14px;font:600 15px/1.2 var(--paper-app);cursor:pointer}
.paper-bar .paper-back{color:var(--paper-chalk)}
.paper-back:hover{background:rgba(0,0,0,.14)}
.paper-texture .paper-back:focus-visible{outline:3px solid #000;outline-offset:2px}

.paper-spread{container-type:inline-size;max-width:1000px;margin:0 auto;padding:clamp(16px,3.2cqw,32px)}
.paper-spread .paper-prefix{font-size:clamp(17px,2.6cqw,24px)}
.paper-spread .paper-name{font-size:clamp(46px,calc(91cqw / var(--paper-nl,7)),118px);line-height:1}
.paper-spread .paper-edition{font-size:clamp(15px,2.2cqw,20px)}
.paper-spread .paper-place{font-size:clamp(14px,1.8cqw,16px);margin-top:9px;border-top-width:6px}
.paper-spread .paper-band{margin:12px calc(-1*clamp(16px,3.2cqw,32px) - 8px) 18px;padding:7px 14px;font-size:clamp(16px,2.2cqw,20px)}
.paper-spread .paper-headline{font-size:clamp(38px,8.4cqw,78px);line-height:.99;outline:none}
.paper-spread .paper-lede{margin-top:12px;font-size:clamp(19px,2.6cqw,23px);line-height:1.32;max-width:40em}
.paper-cols{display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:30px;margin-top:22px;align-items:start}
.paper-cols.paper-no-image{grid-template-columns:minmax(0,1fr)}
.paper-story{font-size:18px;line-height:1.56;max-width:34em}
.paper-story b{font-weight:800}
.paper-cost{margin-top:22px;border-top:6px solid #000;padding-top:8px;max-width:40em}
.paper-stage .paper-cost h2,.paper-before h2{font-size:25px;font-weight:900;line-height:1.1}
.paper-cost table{width:100%;margin-top:6px;border-collapse:collapse;font-size:16.5px;line-height:1.3}
.paper-cost th{font-weight:400;text-align:left;padding:3px 10px 3px 0;vertical-align:top}
.paper-cost th b{font-weight:800}
.paper-cost td{text-align:right;padding:3px 0;white-space:nowrap;vertical-align:top}
.paper-cost .paper-cost-total th{font-weight:900;font-size:19px;border-top:3px solid #000;padding:6px 0 0}
.paper-cost-total div{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 12px}
.paper-cost p{margin-top:8px;font-size:15px;line-height:1.36}
.paper-image img{display:block;width:100%;height:auto;border:2px solid #000;filter:grayscale(1) contrast(1.08)}
.paper-image figcaption{margin-top:9px;font-size:14.5px;line-height:1.34;font-style:italic}
.paper-letter{margin-top:28px;padding:20px 22px 20px;background:#000;color:var(--paper-chalk)}
.paper-stage .paper-letter h2{font-size:27px;font-weight:900;line-height:1.1;margin-bottom:12px}
.paper-letter-text{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 34px;font-size:16.5px;line-height:1.42}
.paper-letter-text p{margin-bottom:10px}
.paper-letter-text b{color:var(--paper-yellow);font-weight:700}
.paper-stage .paper-postscript{font-weight:700;font-style:italic}
.paper-letter-note{margin-top:4px;font-size:14.5px;font-style:italic;line-height:1.3}
.paper-before{margin-top:24px;padding-top:8px;border-top:6px solid #000}
.paper-before p{margin-top:8px;font-size:16.5px;line-height:1.4;max-width:40em}
.paper-before b{font-weight:800}
.paper-act{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:24px}
.paper-take{background:var(--paper-yellow);color:#000;border:3px solid #000;padding:12px 24px;font:700 18px/1.2 var(--paper-app);cursor:pointer}
.paper-take:hover{background:#000;color:var(--paper-yellow)}
.paper-take:focus-visible{outline:3px solid #000;outline-offset:3px}
.paper-act-note{flex-basis:100%;font-size:15px;line-height:1.36;font-style:italic}

.paper-result{max-width:880px;margin:0 auto;padding:clamp(16px,3.4cqw,34px)}
.paper-title{font-size:clamp(34px,6cqw,54px);font-weight:900;line-height:1.03;letter-spacing:-.012em;outline:none}
.paper-explain{margin-top:10px;font-size:18px;line-height:1.42;max-width:40em}
.paper-items{list-style:none;margin-top:20px}
.paper-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 24px;align-items:center;padding:12px 0;border-top:3px solid #000}
.paper-row:first-child{border-top-width:6px}
.paper-stage .paper-row h2{font-size:21px;font-weight:800;line-height:1.2}
.paper-row p{margin-top:2px;font-size:16px;line-height:1.38;max-width:37em}
.paper-choice{display:flex;flex-wrap:wrap;padding-left:2px}
.paper-choice label{position:relative;cursor:pointer}
.paper-choice input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.paper-choice span{display:block;min-width:68px;margin-left:-2px;padding:10px 8px;border:2px solid #000;text-align:center;font:600 14.5px/1.2 var(--paper-app)}
.paper-choice label:hover span{background:rgba(0,0,0,.14)}
.paper-choice input:checked+span{background:#000;color:var(--paper-yellow)}
.paper-choice input:focus-visible+span{position:relative;z-index:1;outline:3px solid #000;outline-offset:2px}
.paper-sum{margin-top:14px;padding-top:10px;border-top:6px solid #000;font-size:18px;line-height:1.38;font-weight:700}
.paper-end{max-width:880px;margin:30px auto 0;font-family:var(--paper-app)}

@container paper (max-width:820px){
  .paper-cols{grid-template-columns:minmax(0,1fr)}
  .paper-letter-text{grid-template-columns:minmax(0,1fr)}
}
@container paper (max-width:700px){
  .paper-shelf{grid-template-columns:minmax(0,1fr);gap:22px}
  .paper-slot{padding:0}
  .paper-lip{margin:-30px 0 0;min-height:0}
  .paper-sheet{transform:none}
  .paper-band{margin-left:-12px;margin-right:-12px}
  .paper-slot-small .paper-note{grid-template-columns:minmax(0,1fr)}
  .paper-note h2{grid-row:auto;max-width:none}
  .paper-spread .paper-band{margin-left:calc(-1*clamp(16px,3.2cqw,32px));margin-right:calc(-1*clamp(16px,3.2cqw,32px))}
}
@container paper (max-width:620px){
  .paper-row{grid-template-columns:minmax(0,1fr)}
  .paper-choice label{flex:1}
  .paper-choice span{min-width:0}
}
`;
    const root = part("div", "paper-stage", "");
    root.style.setProperty("--paper-nl", String(Math.max(7, Z.name.length)));
    el.replaceChildren(style, root);

    function toTop() {
      window.scrollTo(0, 0);
    }

    /* The only motion on the page: the sheet grows out of the shelf. Without browser support or with reduced motion, a plain switch. */
    function transition(old, build) {
      if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
        build();
        return;
      }
      const NAME = "paper-swap";
      old.style.viewTransitionName = NAME;
      let fresh = null;
      const done = () => {
        if (fresh) fresh.style.viewTransitionName = "";
      };
      document.startViewTransition(() => {
        fresh = build();
        if (fresh) fresh.style.viewTransitionName = NAME;
      }).finished.then(done, done);
    }

    const masthead = (a) =>
      '<div class="paper-masthead"><span class="paper-prefix">' + esc(Z.prefix || "") + '</span><span class="paper-name">' + esc(Z.name) + "</span>"
      + '<span class="paper-edition">Edition “' + esc(a.name) + '”</span><span class="paper-place">' + esc(Z.place + ", " + Z.date) + "</span></div>";
    const BAND = '<div class="paper-band">Made up: this is how it could look</div>';
    const grab = (a) => '<button type="button" class="paper-grab" data-edition="' + esc(a.id) + '" aria-label="Read the edition “' + esc(a.name) + '” large"></button>';
    const taken = (a) => (matches(a) ? '<span class="paper-taken">Taken</span>' : "");
    const price = (a) => (WITH_COST && sum(a.yes) ? esc(A.cost(sum(a.yes))) + ", estimated" : a.yes.length + (a.yes.length === 1 ? " item on yes" : " items on yes"));

    function frontPage(a) {
      return part("article", "paper-slot", grab(a)
        + '<div class="paper-sheet paper-texture" style="--paper-tilt:' + a.tilt + '">' + masthead(a) + BAND
        + '<h2 class="paper-headline">' + esc(a.headline) + "</h2>"
        + '<p class="paper-lede">' + esc(a.lede) + "</p>"
        + (a.image ? '<div class="paper-photo" aria-hidden="true"><img alt="" src="' + esc(a.image) + '"></div>' : "") + taken(a) + "</div>"
        + '<div class="paper-lip"><span class="paper-price">' + price(a) + "</span>"
        + '<span class="paper-inside">' + esc(inside(a).join(", ")) + "</span></div>");
    }

    function note() {
      const committed = (A.committed || []).map((z) => z.name);
      return part("article", "paper-slot paper-slot-small", grab(NOTHING)
        + '<div class="paper-sheet paper-note paper-texture"><h2>' + esc(NOTHING.name) + "</h2>"
        + "<p>" + esc(NOTHING.lede) + (committed.length ? " Already promised anyway: " + esc(committed.join(", ")) + "." : "") + "</p>"
        + (WITH_COST ? '<p class="paper-price">No extra ' + esc(A.unit.many) + "</p>" : "") + taken(NOTHING) + "</div>");
    }

    function showKiosk(from) {
      root.replaceChildren();
      const k = part("div", "paper-kiosk",
        '<header class="paper-board"><h1>' + EDITIONS.length + " newspapers for " + esc(Z.date) + "</h1>"
        + "<p>" + esc(Z.intro) + " Click a paper to read it large.</p></header>"
        + '<div class="paper-shelf"></div><div class="paper-desk"></div>');
      const shelf = k.querySelector(".paper-shelf");
      shelf.style.setProperty("--paper-n", String(EDITIONS.length));
      EDITIONS.forEach((a) => shelf.append(frontPage(a)));
      if (NOTHING) k.insertBefore(note(), k.querySelector(".paper-desk"));
      const single = part("button", "paper-single", "Rather decide one by one: see all " + A.items.length + " items");
      single.type = "button";
      single.onclick = () => showList(null);
      k.querySelector(".paper-desk").append(single);
      k.querySelectorAll(".paper-grab").forEach((b) => {
        const a = NOTHING && b.dataset.edition === NOTHING.id ? NOTHING : EDITIONS.find((x) => x.id === b.dataset.edition);
        b.onclick = () => transition(b.nextElementSibling, () => showEdition(a));
      });
      root.append(k);
      toTop();
      if (!from) return null;
      const button = k.querySelector('[data-edition="' + from.id + '"]');
      if (!button) return null;
      button.focus();
      return button.nextElementSibling;
    }

    function costHtml(a) {
      if (!WITH_COST) return "";
      const row = (name, value) => '<tr><th scope="row">' + name + "</th><td>" + esc(value) + "</td></tr>";
      const totalRow = (name, n) => '<tr class="paper-cost-total"><th colspan="2" scope="row"><div><span>' + name + "</span><span>" + esc(A.cost(n)) + ", estimated</span></div></th></tr>";
      const committed = A.committed || [];
      const withCost = a.yes.map(A.item).filter(A.hasCost);
      /* If the edition brings no cost of its own, only what is already promised counts. */
      if (!withCost.length) {
        if (!committed.length) return "";
        return '<section class="paper-cost"><h2>What it costs</h2>'
          + "<p>No new " + esc(A.unit.one) + " is added. What is already promised comes anyway:</p>"
          + "<table>" + committed.map((z) => row(esc(z.name), z.cost ? A.cost(z.cost) : "")).join("") + (committedSum ? totalRow("Together", committedSum) : "") + "</table></section>";
      }
      return '<section class="paper-cost"><h2>What it costs</h2>'
        + "<table>" + withCost.map((p) => row("<b>" + esc(p.short) + ".</b> " + esc(p.title), A.cost(p.cost))).join("") + totalRow("Together", sum(a.yes)) + "</table>"
        + (A.unit.explain ? "<p>" + esc(A.unit.explain) + "</p>" : "")
        + (committedSum ? "<p>Every edition also carries what is already promised: " + esc(A.cost(committedSum)) + ", also estimated.</p>" : "") + "</section>";
    }

    function letterHtml(a) {
      const para = (short, text) => (text ? "<p><b>" + esc(short) + ".</b> " + esc(text) + "</p>" : "");
      /* "Nothing New" has nothing new. What speaks against it there is what stays annoying today. */
      if (!a.yes.length) return A.items.filter((p) => p.proposal === "yes").map((p) => para(p.short, p.familiar || p.why)).join("");
      const i = EDITIONS.indexOf(a);
      const before = i > 0 ? EDITIONS[i - 1] : null;
      /* When the editions build on each other, the letter only covers what is new, and the old still holds. */
      const nested = before && before.yes.length && before.yes.every((id) => a.yes.includes(id));
      const fresh = a.yes.filter((id) => !nested || !before.yes.includes(id)).map(A.item);
      /* The letter speaks against the item. p.counter speaks against the proposal and only fits when the proposal is yes;
         risk and regret always speak against the item. */
      const against = (p) => [(p.proposal === "yes" ? p.counter : ""), p.regret || p.risk || ""].filter(Boolean).join(" ");
      const own = fresh.map((p) => para(p.short, against(p))).join("");
      if (!nested) return own;
      return "<div>" + own + '</div><div><p class="paper-postscript">From the edition “' + esc(before.name) + "” this still holds:</p>"
        + before.yes.map(A.item).map((p) => para(p.short, against(p))).join("") + "</div>";
    }

    function beforeHtml(a) {
      const withConflict = a.yes.map(A.item).filter((p) => p.conflict);
      if (!withConflict.length) return "";
      return '<section class="paper-before"><h2>You already said otherwise</h2>'
        + withConflict.map((p) => "<p><b>" + esc(p.short) + ".</b> " + esc(p.conflict) + "</p>").join("") + "</section>";
    }

    function showEdition(a) {
      root.replaceChildren();
      const letter = letterHtml(a);
      const caption = a.caption || "This is how it could look in this edition.";
      const page = part("div", "paper-read",
        '<div class="paper-bar"><button type="button" class="paper-back">Back to the kiosk</button></div>'
        + '<article class="paper-spread paper-texture">' + masthead(a) + BAND
        + '<h1 class="paper-headline" tabindex="-1">' + esc(a.headline) + "</h1>"
        + '<p class="paper-lede">' + esc(a.lede) + "</p>"
        + '<div class="paper-cols' + (a.image ? "" : " paper-no-image") + '"><div><p class="paper-story"><b>' + esc(Z.place) + ".</b> " + esc(a.story) + "</p>" + costHtml(a) + "</div>"
        + (a.image ? '<figure class="paper-image"><img alt="' + esc(caption) + '" src="' + esc(a.image) + '"><figcaption>' + esc(caption) + "</figcaption></figure>" : "") + "</div>"
        + (letter ? '<section class="paper-letter"><h2>Letter to the editor: why it could go wrong</h2><div class="paper-letter-text">' + letter + "</div>"
          + '<p class="paper-letter-note">No real reader wrote this. The sentences come straight from the list of items.</p></section>' : "")
        + beforeHtml(a)
        + '<div class="paper-act"><button type="button" class="paper-take">Take this edition</button><button type="button" class="paper-back">Back to the kiosk</button>'
        + '<p class="paper-act-note">This fills in all ' + A.items.length + " items and replaces what you already answered there. Afterwards you can change each one.</p></div>"
        + "</article>");
      const spread = page.querySelector(".paper-spread");
      page.querySelectorAll(".paper-back").forEach((b) => (b.onclick = () => transition(spread, () => showKiosk(a))));
      page.querySelector(".paper-take").onclick = () => {
        A.items.forEach((p) => State.set(p.id, target(a, p)));
        /* An edition says nothing about the order. An old order from the build budget would no longer fit the new pick. */
        State.setOrder([]);
        transition(spread, () => showList(a));
      };
      root.append(page);
      toTop();
      page.querySelector("h1").focus({ preventScroll: true });
      return spread;
    }

    function showList(a) {
      root.replaceChildren();
      const row = (p) => '<li class="paper-row"><div><h2 id="paper-n-' + esc(p.id) + '">' + esc(p.short) + "</h2><p>" + esc(p.about) + "</p></div>"
        + '<div class="paper-choice" role="radiogroup" aria-labelledby="paper-n-' + esc(p.id) + '">'
        + A.answers(p).map(([w, l]) => '<label><input type="radio" name="paper-' + esc(p.id) + '" value="' + esc(w) + '"' + (State.value(p.id) === w ? " checked" : "") + "><span>" + esc(l) + "</span></label>").join("")
        + "</div></li>";
      const explain = a
        ? "You took the edition “" + esc(a.name) + "”. What is in the edition is yes. What is not in it and where my proposal was no is no. Everything else is later."
          + (Object.keys(a.choices).length ? " For the choice questions, the edition's pick is set." : "") + " You can change every row here."
        : "Here you answer every item yourself, without taking an edition.";
      const page = part("div", "paper-results",
        '<div class="paper-bar" style="max-width:880px"><button type="button" class="paper-back">Back to the kiosk</button></div>'
        + '<section class="paper-result paper-texture">'
        + '<h1 class="paper-title" tabindex="-1">' + (a ? "What you have marked with it" : "All " + A.items.length + " items one by one") + "</h1>"
        + '<p class="paper-explain">' + explain + "</p>"
        + '<ul class="paper-items">' + A.items.map(row).join("") + "</ul>"
        + '<p class="paper-sum" aria-live="polite"></p></section>'
        + '<section class="paper-end"><div></div></section>');
      const sumEl = page.querySelector(".paper-sum");
      const end = page.querySelector(".paper-end div");
      const drawSum = () => {
        const yes = A.items.filter((p) => State.value(p.id) === "yes").map((p) => p.id);
        if (WITH_COST) {
          sumEl.textContent = (yes.length && sum(yes) ? "What is on yes costs " + A.cost(sum(yes)) + " together, estimated." : "Nothing with a cost is on yes, so no new " + A.unit.many + " are added.")
            + (committedSum ? " On top comes what is already promised: " + A.cost(committedSum) + ", also estimated." : "");
        } else {
          sumEl.textContent = State.count() + " of " + A.items.length + " items answered.";
        }
      };
      drawSum();
      page.addEventListener("change", (e) => {
        State.set(e.target.name.slice("paper-".length), e.target.value);
        drawSum();
      });
      const sheet = page.querySelector(".paper-result");
      page.querySelector(".paper-back").onclick = () => {
        showKiosk(a);
        if (!a) root.querySelector(".paper-single").focus();
      };
      root.append(page);
      A.end(end, "paper");
      toTop();
      page.querySelector("h1").focus({ preventScroll: true });
      return sheet;
    }

    showKiosk(null);
  };
})();
