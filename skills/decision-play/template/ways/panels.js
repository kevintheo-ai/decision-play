/* Way "Four Panels": every item as a small picture story.
   Three painted panels, the fourth shows the real thing (screenshot, excerpt, draft). Without it, the fourth
   caption stands there as text. Items without pictures appear as a text card, so nothing gets lost. */
(function () {
  const A = window.A;

  const CSS = `
@import url("https://fonts.googleapis.com/css2?family=Alegreya:wght@500;800&family=Alegreya+Sans:wght@400;500;700&display=swap");
.panel-root{container-type:inline-size;--panel-paper:#D3CBC0;--panel-sky:#FDF6ED;--panel-ink:#30251F;--panel-edge:clamp(16px,3cqi,28px);color:var(--panel-ink);font:400 18px/1.5 "Alegreya Sans","Avenir Next",-apple-system,sans-serif}
.panel-paper{background:var(--panel-paper);padding:clamp(18px,2.6cqi,26px) var(--panel-edge) clamp(56px,8cqi,88px)}
.panel-column{max-width:1040px;margin:0 auto}
.panel-paper :focus-visible{outline:3px solid var(--panel-ink);outline-offset:3px}

.panel-legend{margin:0 0 clamp(22px,3cqi,30px);max-width:44em;font:500 21px/1.34 "Alegreya",Georgia,serif;text-wrap:balance}
.panel-item + .panel-item{margin-top:clamp(72px,11cqi,120px)}
.panel-title{margin:0 0 14px;font:800 clamp(25px,3.2cqi,31px)/1.14 "Alegreya",Georgia,serif;text-wrap:balance}

.panel-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 14px}
.panel-cell{margin:0;min-width:0}
.panel-frame{border:2px solid var(--panel-ink);background:var(--panel-sky);aspect-ratio:1200/896;overflow:hidden}
.panel-frame img{display:block;width:100%;height:100%;object-fit:cover}
.panel-real img{object-fit:contain;background:linear-gradient(155deg,#31505A,#1F363F)}
.panel-caption{margin:8px 0 0;font:500 20px/1.28 "Alegreya",Georgia,serif;text-wrap:pretty}
.panel-text-only{height:100%;display:grid;place-items:center;padding:8%;text-align:center;background:linear-gradient(155deg,#31505A,#1F363F);color:#ECEFED;font:500 clamp(21px,3.2cqi,29px)/1.24 "Alegreya",Georgia,serif;text-wrap:balance}

.panel-facts{display:grid;grid-template-columns:8.4em minmax(0,40em);gap:9px 20px;margin:26px 0 0}
.panel-facts dt{font-weight:700}
.panel-facts dd{margin:0}
.panel-facts dt:last-of-type{align-self:center}
.panel-choice{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}
.panel-btn{min-width:96px;min-height:44px;padding:8px 20px;border:1.5px solid var(--panel-ink);border-radius:2px;background:none;color:var(--panel-ink);font:inherit;font-weight:500}
@media (hover:hover){.panel-btn:hover{background:rgba(48,37,31,.1)}}
.panel-btn[aria-pressed=true]{background:var(--panel-ink);color:var(--panel-sky)}

.panel-textcard{border:2px solid var(--panel-ink);background:var(--panel-sky);padding:clamp(20px,3.2cqi,32px)}
.panel-textcard .panel-facts{margin-top:18px}

.panel-end{background:#1F363F;color:#ECEFED;padding:clamp(32px,6cqi,56px) var(--panel-edge) clamp(40px,7cqi,72px)}
.panel-end-text{max-width:1040px;margin:0 auto}
.panel-root *{font-variant-numeric:lining-nums}

@container (max-width:600px){
  .panel-strip{grid-template-columns:minmax(0,1fr)}
  .panel-facts{display:block}
  .panel-facts dd{margin:1px 0 13px}
  .panel-btn{flex:1;min-width:0}
}
`;

  function h(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function cell(content, caption, real) {
    const f = h("figure", "panel-cell");
    const frame = h("div", "panel-frame" + (real ? " panel-real" : ""));
    frame.append(content);
    f.append(frame);
    if (caption) f.append(h("figcaption", "panel-caption", caption));
    return f;
  }

  function image(src, alt) {
    const b = document.createElement("img");
    b.src = src;
    b.alt = alt;
    b.loading = "lazy";
    b.decoding = "async";
    b.addEventListener("error", () => {
      /* A missing image should not stay on the page as a broken icon. */
      b.replaceWith(h("div", "panel-text-only", "Image missing"));
    }, { once: true });
    return b;
  }

  function strip(p) {
    const s = h("div", "panel-strip");
    p.imageUrls.forEach((src, i) => s.append(cell(image(src, ""), p.captions[i])));
    // The fourth panel: the real thing if there is one, otherwise the sentence itself as the picture.
    if (p.realImageUrl) s.append(cell(image(p.realImageUrl, p.captions[3]), p.captions[3], true));
    else s.append(cell(h("div", "panel-text-only", p.captions[3]), null));
    return s;
  }

  function facts(p) {
    const dl = h("dl", "panel-facts");
    const row = (title, content) => {
      const dd = h("dd");
      dd.append(content);
      dl.append(h("dt", "", title), dd);
    };
    row("What it is about", p.about);
    if (A.hasCost(p)) row("Cost", "Estimated " + A.cost(p.cost) + "." + (p.costNote ? " " + p.costNote : ""));
    row("Against my proposal", p.counter);
    row("My proposal", A.label(p, p.proposal) + ". " + p.proposalWhy);

    const choice = h("div", "panel-choice");
    choice.setAttribute("role", "group");
    choice.setAttribute("aria-label", "Your answer to: " + p.title);
    A.answers(p).forEach(([w, text]) => {
      const b = h("button", "panel-btn", text);
      b.type = "button";
      b.dataset.id = p.id;
      b.dataset.value = w;
      b.setAttribute("aria-pressed", String(State.value(p.id) === w));
      b.onclick = () => State.set(p.id, State.value(p.id) === w ? null : w);
      choice.append(b);
    });
    row("Your answer", choice);
    return dl;
  }

  function item(p) {
    const withImages = p.imageUrls && p.imageUrls.length === 3;
    const a = h("article", "panel-item" + (withImages ? "" : " panel-textcard"));
    a.append(h("h2", "panel-title", p.nr + ". " + p.title));
    if (withImages) a.append(strip(p));
    a.append(facts(p));
    return a;
  }

  A.build.panels = function (el) {
    const root = h("div", "panel-root");
    root.append(h("style", "", CSS));

    const paper = h("div", "panel-paper");
    const column = h("div", "panel-column");
    column.append(h("p", "panel-legend", (A.panels && A.panels.legend ? A.panels.legend + " " : "") + "Three pictures tell the story, the fourth shows the real thing."));
    A.items.forEach((p) => column.append(item(p)));
    paper.append(column);

    const end = h("div", "panel-end");
    const endText = h("div", "panel-end-text");
    end.append(endText);
    root.append(paper, end);
    el.append(root);
    A.end(endText, "panels");

    const buttons = root.querySelectorAll(".panel-btn");
    const off = State.on(() => {
      if (!root.isConnected) return off(); // way left, the page rebuilds the stage
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(State.value(b.dataset.id) === b.dataset.value)));
    });
  };
})();
