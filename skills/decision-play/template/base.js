/* Basics all ways share: numbers, possible answers, the unit, the four ways.
   window.A is the content from content.json, checked and inserted by build.py. */
(function () {
  const A = window.A;
  const CHARS = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  A.esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => CHARS[c]);

  A.items.forEach((p, i) => { p.nr = i + 1; });
  A.item = (id) => A.items.find((p) => p.id === id) || null;

  const STANDARD = [["yes", "Yes"], ["no", "No"], ["later", "Later"]];
  const WORD = { yes: "yes", no: "no", later: "later" };
  /* Possible answers of an item as [value, button text]. Choice questions have their own options and always "Later". */
  A.answers = (p) => (p.options ? p.options.map((o) => [o.id, o.text]).concat([["later", "Later"]]) : STANDARD);
  A.isChoice = (p) => !!p.options;
  /* How an answer reads in the text for the chat. */
  A.word = (p, w) => {
    if (Object.prototype.hasOwnProperty.call(WORD, w)) return WORD[w];
    const o = (p.options || []).find((x) => x.id === w);
    return o ? o.text : String(w);
  };
  A.label = (p, w) => (A.answers(p).find(([x]) => x === w) || [w, A.word(p, w)])[1];

  /* Unit of the cost, for example build night. Without it there are no amounts. */
  const U = A.unit || null;
  A.cost = (n) => n + " " + (n === 1 ? U.one : U.many);
  A.hasCost = (p) => !p.options && Number.isInteger(p.cost) && p.cost > 0;

  A.WAYS = [
    { id: "paper", title: "Tomorrow's Paper", when: "Over coffee", does: "Newspapers from the future, each with a different pick. You take the future you want to read, then change single items." },
    { id: "budget", title: "Build Budget", when: "To play", does: "You set a budget and put on the build plan what it is worth to you. Then reality rolls the dice." },
    { id: "panels", title: "Four Panels", when: "To look at", does: "Each item as a small picture story. Three pictures tell it, the fourth shows the real thing." },
    { id: "car", title: "In the Car", when: "On the road", does: "To listen to, one piece per item. Only listen while driving, answer after you have parked." },
  ];
  A.wayName = (id) => (A.WAYS.find((w) => w.id === id) || {}).title || null;
  A.build = {};
})();
