/* Shared state of all ways: answers, order, rating of the ways.
   Lives only in this browser on this computer. Clicks are not a decision, only the text in the chat counts. */
(function () {
  const A = window.A;
  const KEY = "decision-play-" + A.key;
  let d = {};
  try {
    d = JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (e) {
    d = {};
  }
  d.answers = d.answers || {}; // item id -> value ("yes", "no", "later" or an option id)
  d.version = d.version || {}; // item id -> version of the question the answer was given to
  d.order = d.order || []; // item ids, built first comes first
  d.ways = d.ways || {}; // way id -> "pleasant" | "okay" | "annoying"

  /* Whatever the stored state has that no longer fits the content is dropped: an answer to a question that has
     changed since (other version) or a value this item no longer offers. */
  A.items.forEach((p) => {
    const w = d.answers[p.id];
    if (w && (d.version[p.id] !== p.version || !A.answers(p).some(([x]) => x === w))) delete d.answers[p.id];
  });
  Object.keys(d.answers).forEach((id) => { if (!A.item(id)) delete d.answers[id]; });

  const listeners = new Set();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(d));
    } catch (e) {
      /* private window: the state only lasts until it is closed */
    }
    /* A listener of a way left long ago must not drag the others down with it. */
    listeners.forEach((f) => {
      try {
        f();
      } catch (e) {
        listeners.delete(f);
      }
    });
  }

  window.State = {
    value: (id) => d.answers[id] || null,
    set(id, value) {
      if (value) {
        d.answers[id] = value;
        d.version[id] = A.item(id).version;
      } else delete d.answers[id];
      save();
    },
    order: () => d.order.slice(),
    setOrder(ids) {
      d.order = ids.slice();
      save();
    },
    wayRating: (w) => d.ways[w] || null,
    rateWay(w, rating) {
      if (rating) d.ways[w] = rating;
      else delete d.ways[w];
      save();
    },
    count: () => Object.keys(d.answers).length,
    on(f) {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    /* The one text for the chat, whichever way it came from. */
    text() {
      const lines = [A.title + ", my answers:"];
      const open = [];
      A.items.forEach((p) => {
        const w = d.answers[p.id];
        if (w) lines.push(p.nr + " " + p.short + ": " + A.word(p, w));
        else open.push(p.nr);
      });
      if (open.length) lines.push("Still open: " + open.join(", "));
      /* Only what is on yes has an order. Whoever changes their mind later should not read both. */
      const row = d.order.filter((id) => d.answers[id] === "yes" && A.item(id));
      if (row.length) lines.push("Order: " + row.map((id) => A.item(id).short).join(", "));
      /* Only ways that are on this page: a rating from an older build without that way would be misleading. */
      const ways = Object.entries(d.ways).filter(([w]) => A.ways.includes(w) && A.wayName(w));
      if (ways.length) lines.push("How the ways felt: " + ways.map(([w, r]) => A.wayName(w) + " " + r).join(", "));
      return lines.join("\n");
    },
    async copy() {
      const t = this.text();
      try {
        await navigator.clipboard.writeText(t);
        return true;
      } catch (e) {
        /* file:// without clipboard permission: through a hidden field */
        const a = document.createElement("textarea");
        a.value = t;
        a.style.position = "fixed";
        a.style.opacity = "0";
        document.body.append(a);
        a.select();
        let ok = false;
        try {
          ok = document.execCommand("copy");
        } catch (e2) {
          ok = false;
        }
        a.remove();
        return ok;
      }
    },
  };
})();
