/* Build Budget: a budget in the unit of the content, cards on the build plan, then reality rolls the dice.
   Only yes/no items with a cost take part. Costs stay estimates. No points and no reward,
   which is why p.proposal is deliberately unused here. */
(function () {
  const A = window.A;
  const esc = A.esc;
  const STENCIL = "'Big Shoulders Stencil',Impact,'Arial Narrow',sans-serif";
  const SLAB = "Bitter,Rockwell,Georgia,serif";
  const ROLL_MS = 1350, READ_MS = 850, LEAD_MS = 1500;

  // Wood grain as SVG noise, stretched lengthwise. Without it the surface stays one colour.
  const grain = (r, g, b, k) => 'url("data:image/svg+xml,' + encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='900' height='320'><filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.008 .36' numOctaves='3' seed='11' stitchTiles='stitch'/>"
    + `<feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${k} ${-k * 0.34}'/></filter><rect width='900' height='320' filter='url(#f)'/></svg>`) + '")';
  const LIGHT = grain(0.36, 0.22, 0.08, 0.44);
  const DARK = grain(0.72, 0.55, 0.36, 0.3);

  const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil:wght@700;800&family=Bitter:wght@400;600;700&display=swap');
.budget{--wood:#D8C08F;--light:#F2E7CF;--ink:#26211A;--soft:#4E4334;--dark:#36281C;--chalk:#F6ECD9;--yellow:#F6C71E;--blue:#1A4C99;--rail:#CBA76B;--unit:48px;position:relative;min-height:100vh;min-height:100dvh;padding:clamp(24px,3.4vw,44px) clamp(16px,2.8vw,34px) 72px;background:var(--wood) ${LIGHT};color:var(--ink);font:400 17px/1.55 ${SLAB};overflow-wrap:break-word;scroll-margin-top:var(--a-head,0px)}
.budget :focus-visible{outline:3px solid var(--blue);outline-offset:2px}
.budget [tabindex="-1"]:focus-visible{outline:none}
.budget-say{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.budget-big{font:800 clamp(62px,8.4vw,94px)/.92 ${STENCIL};margin:0 0 14px}
.budget-intro{max-width:66ch;margin:0 0 10px;font-size:18px}
.budget-h2{font:800 36px/1 ${STENCIL};margin:0}
.budget-small{font-size:15.5px;line-height:1.45;color:var(--soft);margin:6px 0 0}

.budget-slider{margin:24px 0 30px;padding:16px 18px 15px;background:var(--light);border:2px solid var(--ink);border-radius:3px}
.budget-question{display:block;font-weight:700;font-size:21px;line-height:1.25}
.budget-slider-row{display:flex;align-items:center;gap:26px;margin-top:6px}
.budget-track{flex:1;min-width:0}
.budget-track input{display:block;width:100%;height:40px;margin:0;appearance:none;-webkit-appearance:none;background:transparent;cursor:pointer}
.budget-track input::-webkit-slider-runnable-track{height:12px;background:var(--rail);border:2px solid var(--ink);border-radius:2px}
.budget-track input::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:38px;margin-top:-15px;background:var(--dark);border:2px solid var(--ink);border-radius:3px}
.budget-track input::-moz-range-track{height:8px;background:var(--rail);border:2px solid var(--ink);border-radius:2px}
.budget-track input::-moz-range-thumb{width:20px;height:34px;background:var(--dark);border:2px solid var(--ink);border-radius:3px}
.budget-scale{display:flex;justify-content:space-between;padding:0 12px;font:700 17px/1 ${STENCIL}}
.budget-scale span{width:0;display:flex;justify-content:center}
.budget-number{display:flex;align-items:baseline;gap:7px;white-space:nowrap;font-weight:600}
.budget-number b{font:800 66px/.86 ${STENCIL}}
.budget-committed{margin:12px 0 0;font-size:15.5px;line-height:1.45;color:var(--soft)}

.budget-cols{display:grid;grid-template-columns:minmax(0,1fr) 336px;gap:28px;align-items:start}
.budget-pick{margin:6px 0 14px;max-width:62ch}
.budget-cards{display:grid;gap:14px}
.budget-card{position:relative;background:var(--light);border:2px solid var(--ink);border-radius:3px;padding:13px 16px 13px}
.budget-card:hover{background:#F7EEDC}
.budget-placed,.budget-placed:hover{background:rgba(242,231,207,.42);border-style:dashed}
.budget-nofit:hover{background:var(--light)}
.budget-card-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:4px 14px}
.budget-name{font:800 25px/1.05 ${STENCIL}}
.budget-size{display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:600;max-width:100%}
.budget-units{display:inline-flex;min-width:0}
.budget-units i{display:block;flex:0 1 15px;width:15px;height:13px;background:var(--rail);border:1.5px solid var(--ink);margin-left:-1.5px}
.budget-units i:first-child{margin-left:0}
.budget-units i.budget-over{background:repeating-linear-gradient(-45deg,var(--yellow) 0 3px,var(--ink) 3px 6px)}
.budget-title{font-size:20px;font-weight:700;line-height:1.25;margin:7px 0 5px}
.budget-familiar{margin:0 0 6px;color:var(--soft)}
.budget-about{margin:0}
.budget-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;margin-top:10px}
.budget-proscons{position:relative;z-index:1;font-size:16px}
.budget-proscons summary{cursor:pointer;font-weight:600}
.budget-proscons p{margin:5px 0 0}
.budget-proscons[open]{flex-basis:100%}
.budget-btn{font:600 16px/1.25 ${SLAB};padding:8px 14px;background:transparent;color:inherit;border:2px solid currentColor;border-radius:3px}
.budget-btn:hover{background:var(--ink);color:var(--light);border-color:var(--ink)}
.budget-place{margin-left:auto}
.budget-place::after{content:"";position:absolute;inset:0}
.budget-card:hover .budget-place{background:var(--ink);color:var(--light);border-color:var(--ink)}
.budget-place:focus-visible{outline:none}
.budget-place:focus-visible::after{outline:3px solid var(--blue);outline-offset:3px;border-radius:3px}
.budget-nofit .budget-place,.budget-nofit:hover .budget-place{background:transparent;color:var(--soft);border:2px dashed var(--soft);font-weight:400;cursor:default}
.budget-nofit .budget-place::after{cursor:default}
.budget-oversize{border-style:double;border-width:4px}
.budget-oversize:hover{background:var(--light)}
.budget-oversize .budget-units{display:flex;margin:9px 0 0}
.budget-neverfits{margin:9px 0 0;font-weight:600}
.budget-without{margin:16px 0 0;color:var(--soft)}

.budget-side{position:sticky;top:calc(var(--a-head,0px) + 12px);max-height:calc(100vh - 24px - var(--a-head,0px));overflow:auto;padding:4px;margin:-4px}
.budget-plan-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px}
.budget-status{display:flex;gap:14px;margin:0;font-size:15px;font-weight:600;white-space:nowrap}
.budget-status b{font:800 34px/.9 ${STENCIL}}
.budget-over-by{background:var(--yellow);padding:0 5px;border-radius:2px}
.budget-plan{--row:34px;display:grid;grid-template-columns:30px minmax(0,1fr);margin-top:12px}
.budget-plan[data-dense]{--unit:40px}
.budget-ruler{display:flex;flex-direction:column}
.budget-ruler span{height:var(--unit);display:flex;align-items:center;justify-content:center;background:var(--rail);border:2px solid var(--ink);border-top-width:0;font:800 19px/1 ${STENCIL}}
.budget-ruler span:first-child{border-top-width:2px}
.budget-ruler .budget-overflow{background:repeating-linear-gradient(-45deg,var(--yellow) 0 9px,var(--ink) 9px 18px);border:0}
.budget-field{position:relative;min-height:calc(var(--rows) * var(--unit))}
.budget-slots{position:absolute;left:0;right:0;top:0;height:calc(var(--budget) * var(--unit));border:2px dashed rgba(38,33,26,.5);border-left:0;background:repeating-linear-gradient(to bottom,transparent 0,transparent calc(var(--unit) - 1px),rgba(38,33,26,.22) calc(var(--unit) - 1px),rgba(38,33,26,.22) var(--unit))}
.budget-empty{position:absolute;left:14px;right:10px;top:9px;margin:0;font-size:15.5px;line-height:1.35;color:var(--soft)}
.budget-blocks{position:relative;list-style:none;margin:0;padding:0}
.budget-block{position:relative;height:calc(var(--n) * var(--unit));display:flex;align-items:flex-start;gap:8px;padding:calc((var(--unit) - var(--row)) / 2) 5px 0 9px;background:var(--dark) ${DARK};background-clip:padding-box;border:1px solid transparent;border-left-width:0;color:var(--chalk);overflow:hidden}
.budget-block[draggable="true"]{cursor:grab}
.budget-block :focus-visible{outline-color:var(--chalk);outline-offset:-1px}
.budget-block[data-new]{animation:budget-place-in .18s ease-out}
.budget-block[data-grew]{animation:budget-grow .65s cubic-bezier(.3,.7,.3,1) both}
.budget-block[data-drop="top"]{box-shadow:inset 0 4px 0 var(--chalk)}
.budget-block[data-drop="bottom"]{box-shadow:inset 0 -4px 0 var(--chalk)}
@keyframes budget-place-in{from{opacity:.25;transform:translateY(-8px)}}
@keyframes budget-grow{from{height:calc((var(--n) - 1) * var(--unit))}}
.budget-bname{flex:1;min-width:0;font:800 22px/var(--row) ${STENCIL};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.budget-bcost{font-size:14px;line-height:var(--row);white-space:nowrap}
.budget-block[data-tall] .budget-bcost{position:absolute;left:9px;top:calc(var(--unit) + (var(--unit) - var(--row)) / 2)}
.budget-controls{display:flex;gap:2px;flex:none}
.budget-controls button{width:32px;height:var(--row);padding:0;display:grid;place-items:center;background:transparent;color:var(--chalk);border:1px solid transparent;border-radius:3px}
.budget-controls button:hover{border-color:var(--chalk)}
.budget-controls button[aria-disabled="true"]{opacity:.35;cursor:default;border-color:transparent}
.budget-controls svg{width:16px;height:16px;display:block}
.budget-more{position:absolute;left:0;right:0;bottom:0;height:var(--unit);display:flex;align-items:center;padding:0 10px;background:var(--yellow);color:var(--ink);font-size:14.5px;font-weight:600}
.budget-cut{position:absolute;left:-30px;right:0;height:0;border-top:3px dashed var(--blue);z-index:2;pointer-events:none}
.budget-main{display:block;width:100%;margin-top:14px;padding:13px 14px 12px;font:800 27px/1.05 ${STENCIL};background:var(--yellow);color:var(--ink);border:2.5px solid var(--ink);border-radius:3px}
.budget-main:hover{background:#FFD840}
.budget-main:disabled{background:transparent;color:var(--soft);border-style:dashed;cursor:default}
.budget-verdict{margin:14px 0 0;font-weight:600}
.budget-verdict-over{background:var(--yellow);border:2px solid var(--ink);border-radius:3px;padding:9px 12px}
.budget-removed{margin-top:14px;font-size:16px}
.budget-removed ul{list-style:none;margin:5px 0 0;padding:0}
.budget-removed li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-top:1px solid rgba(38,33,26,.35)}
.budget-removed .budget-btn{padding:4px 10px;font-size:15px}

.budget-dock{display:none}

.budget-bench{background:var(--dark) ${DARK};color:var(--chalk);border:2.5px solid var(--ink);border-radius:3px;padding:24px 24px 18px;overflow:hidden}
.budget-bench :focus-visible{outline-color:var(--chalk)}
.budget-bench-title{font:800 clamp(44px,5vw,58px)/.98 ${STENCIL};margin:0 0 12px}
.budget-reason{margin:0;font-size:19px;line-height:1.45;max-width:54ch}
.budget-source{color:#CDBEA5;font-size:15px}
.budget-rule{margin:10px 0 0;color:#DCCFB8;max-width:58ch}
.budget-rolls{list-style:none;margin:18px 0 0;padding:0}
.budget-roll{display:flex;align-items:center;gap:20px;padding:10px 12px 10px 4px;border-top:1px solid rgba(246,236,217,.18)}
.budget-roll.budget-active{background:rgba(246,236,217,.07)}
.budget-roll-name{font:800 28px/1.05 ${STENCIL}}
.budget-roll-size{font-size:15px;color:#CDBEA5}
.budget-roll-text{margin:4px 0 0;color:#B8A98F}
.budget-rolled .budget-roll-text{color:var(--chalk);font-weight:600}
.budget-longer .budget-roll-text{color:var(--yellow)}

.budget-spot{--w:60px;position:relative;flex:none;width:112px;height:112px}
.budget-spot::before{content:"";position:absolute;inset:16px 16px 8px;border:2px dashed rgba(246,236,217,.34);border-radius:3px}
.budget-shadow{position:absolute;left:50%;top:50%;width:104px;height:66px;margin:-20px 0 0 -52px;background:radial-gradient(closest-side,rgba(0,0,0,.62),rgba(0,0,0,0))}
.budget-scene{position:absolute;inset:0;perspective:560px;perspective-origin:50% 12%}
.budget-lift{position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d}
.budget-body{position:absolute;left:calc(var(--w) / -2);top:calc(var(--w) / -2);width:var(--w);height:var(--w);transform-style:preserve-3d}
.budget-face{position:absolute;inset:0;background:#E5BC80 repeating-linear-gradient(96deg,rgba(122,74,24,.13) 0 1px,transparent 1px 6px);border:1px solid #8A5C28;border-radius:2px}
.budget-face svg{position:absolute;inset:0;width:100%;height:100%;fill:#2A1B10}
.budget-face::after{content:"";position:absolute;inset:0;background:#2E1906;opacity:.3;transition:opacity .3s}
.budget-face[data-s="1"]{transform:translateZ(calc(var(--w) / 2))}
.budget-face[data-s="6"]{transform:rotateY(180deg) translateZ(calc(var(--w) / 2))}
.budget-face[data-s="3"]{transform:rotateY(90deg) translateZ(calc(var(--w) / 2))}
.budget-face[data-s="4"]{transform:rotateY(-90deg) translateZ(calc(var(--w) / 2))}
.budget-face[data-s="2"]{transform:rotateX(90deg) translateZ(calc(var(--w) / 2))}
.budget-face[data-s="5"]{transform:rotateX(-90deg) translateZ(calc(var(--w) / 2))}
.budget-face[data-s="2"]::after,.budget-face[data-s="5"]::after{opacity:.46}
.budget-face[data-s="3"]::after,.budget-face[data-s="4"]::after{opacity:.2}
.budget-face.budget-up::after{opacity:0}

.budget-result{max-width:700px}
.budget-result .budget-big{font-size:clamp(50px,6.4vw,72px)}
.budget-rows{list-style:none;margin:12px 0 0;padding:0;border-top:2.5px solid var(--ink)}
.budget-row{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:2px 10px;align-items:baseline;padding:10px 0;border-bottom:1px solid rgba(38,33,26,.4)}
.budget-rnr{font:800 25px/1 ${STENCIL}}
.budget-rname{font-weight:700;line-height:1.3}
.budget-rname small{display:block;font-size:15.5px;font-weight:400;color:var(--soft)}
.budget-rcost{text-align:right;font-weight:600;white-space:nowrap}
.budget-rcost small{display:block;font-size:14px;font-weight:400;color:var(--soft)}
.budget-total{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:12px 0 0;font:800 31px/1.1 ${STENCIL}}
.budget-left-out{margin:10px 0 0}
.budget-sentence{margin:16px 0 0;font-weight:600;font-size:19px;line-height:1.4}
.budget-confirm{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin-top:16px}
.budget-confirm .budget-main{width:auto;margin:0;padding:12px 22px 11px}
.budget-confirm .budget-small{flex:1 1 280px;margin:0}
.budget-end-area{margin-top:26px;max-width:700px;display:flex;flex-wrap:wrap;gap:16px 26px;align-items:flex-start;padding:20px 22px;background:var(--dark) ${DARK};color:var(--chalk);border:2.5px solid var(--ink);border-radius:3px}
.budget-end-area :focus-visible{outline-color:var(--chalk)}
.budget-end-rest{flex:1 1 360px;min-width:0}
.budget-end-area .budget-btn:hover{background:var(--chalk);color:var(--dark);border-color:var(--chalk)}

@media (max-width:1279px){
  .budget{padding-bottom:104px}
  .budget-cols{grid-template-columns:minmax(0,1fr)}
  .budget-side{position:static;max-height:none;overflow:visible;padding:0;margin:0}
  .budget-plan,.budget-plan[data-dense]{--unit:52px;--row:40px}
  .budget-controls button{width:40px}
  .budget-dock{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:20;align-items:center;justify-content:space-between;gap:12px;padding:9px 16px;padding-bottom:max(9px,env(safe-area-inset-bottom));background:var(--dark);color:var(--chalk);font-weight:600;font-size:16px}
  .budget-dock :focus-visible{outline-color:var(--chalk)}
  .budget-dock .budget-btn{padding:6px 12px;white-space:nowrap}
  .budget-dock .budget-btn:hover{background:var(--chalk);color:var(--dark);border-color:var(--chalk)}
}
@media (max-width:520px){
  .budget-slider-row{gap:14px}
  .budget-number{flex-direction:column;align-items:center;gap:0;font-size:14px}
  .budget-number b{font-size:52px}
  .budget-scale{font-size:14px}
  .budget-place{width:100%;margin-left:0}
  .budget-bench{padding:18px 14px 14px}
  .budget-roll{gap:10px;padding-right:4px}
}
@media (prefers-reduced-motion:reduce){
  .budget-block[data-new],.budget-block[data-grew]{animation:none}
  .budget-face::after{transition:none}
}
`;

  const PIPS = {
    1: [[50, 50]],
    2: [[27, 27], [73, 73]],
    3: [[27, 27], [50, 50], [73, 73]],
    4: [[27, 27], [73, 27], [27, 73], [73, 73]],
    5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
    6: [[27, 25], [73, 25], [27, 50], [73, 50], [27, 75], [73, 75]],
  };
  // rotateX, rotateY that bring each face up (towards the camera). Opposite faces add up to 7.
  const POSE = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
  const TILT = 36;

  const ICON = {
    up: '<path d="M3 10.5 8 5.2l5 5.3" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    down: '<path d="M3 5.5 8 10.8l5-5.3" fill="none" stroke="currentColor" stroke-width="2.2"/>',
    remove: '<path d="M3.6 3.6l8.8 8.8M12.4 3.6l-8.8 8.8" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  };

  /* For and against, without giving the proposal away: why always speaks for the item, risk and regret always against.
     counter speaks against the proposal and only fits where its direction is clear. */
  function weigh(p) {
    const pro = p.why || (p.proposal === "no" ? p.counter : "");
    const con = p.risk || p.regret || (p.proposal === "yes" ? p.counter : "");
    if (!pro && !con) return "";
    return '<details class="budget-proscons"><summary>For and against</summary>'
      + (pro ? "<p>For: " + esc(pro) + "</p>" : "")
      + (con ? "<p>Against: " + esc(con) + "</p>" : "") + "</details>";
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const units = (n, limit) => '<span class="budget-units" aria-hidden="true">'
    + Array.from({ length: n }, (_, i) => (i >= limit ? '<i class="budget-over"></i>' : "<i></i>")).join("") + "</span>";

  function dieHtml() {
    const face = (n) => '<div class="budget-face" data-s="' + n + '"><svg viewBox="0 0 100 100" aria-hidden="true">'
      + PIPS[n].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="9.5"/>').join("") + "</svg></div>";
    return '<div class="budget-shadow"></div><div class="budget-scene"><div class="budget-lift"><div class="budget-body">'
      + [1, 2, 3, 4, 5, 6].map(face).join("") + "</div></div></div>";
  }

  /* The die falls, bounces twice and settles. Without motion it is there at once. */
  function throwDie(spot, pips) {
    spot.insertAdjacentHTML("beforeend", dieHtml());
    const body = spot.querySelector(".budget-body");
    const lift = spot.querySelector(".budget-lift");
    const shadow = spot.querySelector(".budget-shadow");
    const scene = spot.querySelector(".budget-scene");
    const [x, y] = POSE[pips];
    const spin = (Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 13);
    const pose = (z, ax, ay) => "rotateX(" + TILT + "deg) rotateZ(" + z + "deg) rotateX(" + ax + "deg) rotateY(" + ay + "deg)";
    body.style.transform = pose(spin, x, y);
    const settled = () => body.querySelector('[data-s="' + pips + '"]').classList.add("budget-up");
    if (calm()) {
      settled();
      return Promise.resolve();
    }
    const fall = "cubic-bezier(.55,0,.85,.45)", rise = "cubic-bezier(.15,.55,.45,1)";
    // Fade in on the scene: opacity on .budget-lift would flatten the 3D die.
    scene.animate({ opacity: [0, 1] }, ROLL_MS * 0.2);
    lift.animate([
      { transform: "translateY(-170px)", easing: fall },
      { transform: "translateY(0)", offset: 0.52, easing: rise },
      { transform: "translateY(-18px)", offset: 0.68, easing: fall },
      { transform: "translateY(0)", offset: 0.82, easing: rise },
      { transform: "translateY(-4px)", offset: 0.9, easing: fall },
      { transform: "translateY(0)" },
    ], ROLL_MS);
    shadow.animate([
      { transform: "scale(.5)", opacity: 0 },
      { transform: "scale(1)", opacity: 1, offset: 0.52 },
      { transform: "scale(.88)", opacity: 0.75, offset: 0.68 },
      { transform: "scale(1)", opacity: 1, offset: 0.82 },
      { transform: "scale(1)", opacity: 1 },
    ], ROLL_MS);
    return body.animate(
      [{ transform: pose(spin + 130, x + 540, y - 360) }, { transform: pose(spin, x, y) }],
      { duration: ROLL_MS, easing: "cubic-bezier(.2,.72,.3,1)" },
    ).finished.then(settled);
  }

  A.build.budget = function (el) {
    const B = A.budget || {};
    const U = A.unit;
    const MIN = B.min, MAX = B.max, START = B.start; // set and checked by build.py
    const cost = A.cost;
    const number = (n) => "<b>" + n + "</b>" + esc(n === 1 ? U.one : U.many);
    const cards = A.items.filter((p) => A.hasCost(p) && p.cost <= MAX);
    const tooBig = A.items.filter((p) => A.hasCost(p) && p.cost > MAX);
    const without = A.items.filter((p) => !A.hasCost(p));
    const item = A.item;

    el.innerHTML = "<style>" + CSS + '</style><div class="budget"><div class="budget-say" aria-live="polite"></div><div class="budget-area"></div></div>';
    const root = el.querySelector(".budget");
    const area = el.querySelector(".budget-area");
    const say = (t) => { el.querySelector(".budget-say").textContent = t; };

    let s, dragged = null;
    const length = (id) => item(id).cost + (s.plus[id] || 0);
    const used = () => s.plan.reduce((n, id) => n + length(id), 0);

    function toTop(target) {
      root.scrollIntoView();
      if (target) target.focus({ preventScroll: true });
    }

    /* Cards */
    function cardHtml(p) {
      const oversize = p.cost > MAX;
      return '<article class="budget-card' + (oversize ? ' budget-oversize"' : '" data-id="' + esc(p.id) + '"') + ">"
        + '<div class="budget-card-head"><span class="budget-name">' + esc(p.short) + '</span><span class="budget-size">'
        + (oversize ? "" : units(p.cost, Infinity)) + "estimated " + esc(cost(p.cost)) + "</span></div>"
        + (oversize ? units(p.cost, START) : "")
        + '<h3 class="budget-title">' + esc(p.title) + "</h3>"
        + (p.familiar ? '<p class="budget-familiar">' + esc(p.familiar) + "</p>" : "")
        + '<p class="budget-about">' + esc(p.about) + "</p>"
        + (oversize ? '<p class="budget-neverfits">Fits no round here, not even with all ' + esc(cost(MAX)) + ". When you mark a plan, this card stays as it is.</p>" : "")
        + '<div class="budget-foot">' + weigh(p)
        + (oversize ? "" : '<button type="button" class="budget-btn budget-place" data-a="place"></button>')
        + "</div></article>";
    }

    function updateCards() {
      const free = s.budget - used();
      area.querySelectorAll(".budget-card[data-id]").forEach((k) => {
        const p = item(k.dataset.id), placed = s.plan.includes(p.id), fits = p.cost <= free;
        k.classList.toggle("budget-placed", placed);
        k.classList.toggle("budget-nofit", !placed && !fits);
        const b = k.querySelector(".budget-place");
        b.textContent = placed ? "Take off the build plan" : fits ? "Put on the build plan" : "No longer fits, take something out first.";
        b.setAttribute("aria-label", p.short + ": " + b.textContent);
        if (!placed && !fits) b.setAttribute("aria-disabled", "true");
        else b.removeAttribute("aria-disabled");
      });
      area.querySelectorAll(".budget-oversize").forEach((k, i) => {
        const bar = k.querySelector(".budget-units");
        if (bar) bar.outerHTML = units(tooBig[i].cost, s.budget);
      });
    }

    /* Build plan */
    function blockHtml(id, fresh) {
      const p = item(id), n = length(id), i = s.plan.indexOf(id);
      const live = s.phase === "plan" || s.phase === "clear";
      const button = (a, label, icon, off) => '<button type="button" data-a="' + a + '" aria-label="' + esc(label) + '" title="' + esc(label) + '"'
        + (off ? ' aria-disabled="true"' : "") + '><svg viewBox="0 0 16 16" aria-hidden="true">' + ICON[icon] + "</svg></button>";
      return '<li class="budget-block" data-id="' + esc(id) + '" style="--n:' + n + '"' + (n > 1 ? " data-tall" : "") + (live ? ' draggable="true"' : "")
        + (fresh === id ? (s.phase === "plan" ? " data-new" : " data-grew") : "") + ">"
        /* With one unit the height shows the amount; without the label the name has room. */
        + '<span class="budget-bname">' + esc(p.short) + "</span>" + (n > 1 ? '<span class="budget-bcost">' + esc(cost(n)) + "</span>" : '<span class="budget-say">' + esc(cost(n)) + "</span>")
        + (live ? '<span class="budget-controls">'
          + button("up", p.short + " up", "up", i === 0)
          + button("down", p.short + " down", "down", i === s.plan.length - 1)
          + (s.phase === "plan" ? button("drop", p.short + " off the build plan", "remove") : button("takeout", "Take " + p.short + " out", "remove"))
          + "</span>" : "")
        + (s.plus[id] ? '<span class="budget-more">' + esc(cost(1)) + " longer, rolled</span>" : "")
        + "</li>";
    }

    function footHtml() {
      const rest = s.budget - used();
      if (s.phase === "plan") {
        const note = !s.plan.length ? "Put at least one card on the build plan first."
          : rest < 0 ? "The build plan is " + cost(-rest) + " too long. Take something out or give the round more."
            : "Every card of " + cost(2) + " or more gets a roll. On a 5 or 6 it takes " + cost(1) + " longer. You only roll once. Afterwards you can still take things out and reorder, but not add anything.";
        return '<button type="button" class="budget-main" data-a="roll"' + (!s.plan.length || rest < 0 ? " disabled" : "") + ">Roll for reality</button>"
          + '<p class="budget-small">' + esc(note) + "</p>";
      }
      if (s.phase !== "clear") return "";
      const outside = s.removed.length ? '<div class="budget-removed">Taken out<ul>' + s.removed.map((r) => '<li data-id="' + esc(r.id) + '"><span>' + esc(item(r.id).short) + ", " + esc(cost(length(r.id)))
        + '</span><button type="button" class="budget-btn" data-a="putback">Put back in</button></li>').join("") + "</ul></div>" : "";
      if (rest < 0) {
        return '<p class="budget-verdict budget-verdict-over" tabindex="-1">' + esc(cost(-rest)) + " too much. Take something out with the cross on the block until it fits again. You cannot roll again.</p>" + outside;
      }
      return '<p class="budget-verdict" tabindex="-1">' + (rest === 0 ? "It fits exactly, nothing is left." : "It fits. " + esc(cost(rest)) + " left.") + "</p>"
        + '<button type="button" class="budget-main" data-a="next">Next: how it would be built</button>' + outside;
    }

    function drawSide(fresh) {
      const side = area.querySelector(".budget-side");
      if (!side) return;
      const a = document.activeElement;
      const keep = a && a.dataset && a.dataset.a && side.contains(a)
        ? (a.closest("[data-id]") ? '[data-id="' + a.closest("[data-id]").dataset.id + '"] ' : "") + '[data-a="' + a.dataset.a + '"]' : null;
      const b = used(), rest = s.budget - b, rows = Math.max(s.budget, b);
      const over = rest < 0;
      side.innerHTML = '<div class="budget-plan-head"><h2 class="budget-h2" tabindex="-1">Build plan</h2>'
        + '<p class="budget-status"><span><b>' + b + "</b> used</span>"
        + (over ? '<span class="budget-over-by"><b>' + -rest + "</b> too much</span>" : "<span><b>" + rest + "</b> free</span>") + "</p></div>"
        + '<p class="budget-small">The top gets built first. Budget: ' + esc(cost(s.budget)) + "."
        + (s.phase === "rolling" ? "" : " Move things with the buttons, the arrow keys or the mouse.") + "</p>"
        + '<div class="budget-plan"' + (rows > 10 ? " data-dense" : "") + ' style="--budget:' + s.budget + ";--rows:" + rows + '">'
        + '<div class="budget-ruler" aria-hidden="true">'
        + Array.from({ length: s.budget }, (_, i) => "<span>" + (i + 1) + "</span>").join("")
        + (over ? '<span class="budget-overflow" style="height:calc(' + -rest + ' * var(--unit))"></span>' : "") + "</div>"
        + '<div class="budget-field"><div class="budget-slots" aria-hidden="true"></div>'
        + (s.plan.length ? '<ol class="budget-blocks">' + s.plan.map((id) => blockHtml(id, fresh)).join("") + "</ol>"
          : '<p class="budget-empty">Still empty. Pick a card, it lands here.</p>')
        + (over ? '<div class="budget-cut" aria-hidden="true" style="top:calc(' + s.budget + ' * var(--unit))"></div>' : "")
        + "</div></div>" + footHtml();
      if (keep) { const target = side.querySelector(keep); if (target) target.focus(); }
    }

    function update(fresh) {
      updateCards();
      drawSide(fresh);
      const dock = area.querySelector(".budget-dock span");
      if (dock) {
        const rest = s.budget - used();
        dock.textContent = used() + " of " + cost(s.budget) + (rest < 0 ? ", " + -rest + " too much" : ", " + rest + " free");
      }
    }

    function showPlan() {
      const z = A.committed || [], committedSum = z.reduce((n, x) => n + (x.cost || 0), 0);
      area.innerHTML = '<h1 class="budget-big" tabindex="-1">' + esc(B.title || "Build Budget") + "</h1>"
        + '<p class="budget-intro">' + esc(B.intro ? B.intro + " " : "") + cards.length + " items are up for grabs, and the budget is not enough for all of them. You give this round a budget and put on the build plan what it is worth to you.</p>"
        + '<p class="budget-intro">' + esc(U.explain ? U.explain + " " : "") + "All amounts here are estimates.</p>"
        + '<section class="budget-slider"><label class="budget-question" for="budget-input">How many ' + esc(U.many) + " do you give this round?</label>"
        + '<div class="budget-slider-row"><div class="budget-track"><input id="budget-input" data-a="budget" type="range" min="' + MIN + '" max="' + MAX + '" step="1" value="' + s.budget + '" aria-valuetext="' + esc(cost(s.budget)) + '">'
        + '<div class="budget-scale" aria-hidden="true">' + Array.from({ length: MAX - MIN + 1 }, (_, i) => "<span>" + (MIN + i) + "</span>").join("") + "</div></div>"
        + '<output class="budget-number" for="budget-input">' + number(s.budget) + "</output></div>"
        + (z.length ? '<p class="budget-committed">What is already promised comes on top and is not subtracted: ' + esc(z.map((x) => x.name).join(", ")) + "." + (committedSum ? " Together an estimated " + esc(cost(committedSum)) + "." : "") + "</p>" : "") + "</section>"
        + '<div class="budget-cols"><section><h2 class="budget-h2">Up for grabs</h2>'
        + '<p class="budget-pick">Read the card and put it on the build plan if it is worth the cost to you. A second click takes it off again.</p>'
        + '<div class="budget-cards">' + cards.map(cardHtml).join("") + tooBig.map(cardHtml).join("") + "</div>"
        + (without.length ? '<p class="budget-without">Not in the game, because there is no cost or it is a choice: ' + esc(without.map((p) => p.short).join(", ")) + ". Answer those in the overview or in another way.</p>" : "")
        + '</section><aside class="budget-side" aria-label="Build plan"></aside></div>'
        + '<div class="budget-dock"><span></span><button type="button" class="budget-btn" data-a="toplan">To the build plan</button></div>';
      update();
    }

    /* Dice round */
    function showRolling() {
      const due = s.plan.filter((id) => item(id).cost >= 2);
      const small = s.plan.filter((id) => item(id).cost < 2).map((id) => item(id).short);
      area.innerHTML = '<div class="budget-cols"><section class="budget-bench">'
        + '<h2 class="budget-bench-title" tabindex="-1">Roll for reality</h2>'
        + '<p class="budget-reason">Effort is almost always underestimated. In one study, 68&nbsp;% of projects were finished later than expected. <span class="budget-source">(Buehler et al., 1994)</span></p>'
        + '<p class="budget-rule">Every card of ' + esc(cost(2)) + " or more gets exactly one roll. On a 5 or 6 it takes " + esc(cost(1)) + " longer, otherwise it stays.</p>"
        + (due.length ? '<ol class="budget-rolls">' + due.map((id) => '<li class="budget-roll" data-id="' + esc(id) + '"><div class="budget-spot"></div><div>'
          + '<div class="budget-roll-name">' + esc(item(id).short) + '</div><div class="budget-roll-size">estimated ' + esc(cost(item(id).cost)) + "</div>"
          + '<p class="budget-roll-text">Waiting for the roll.</p></div></li>').join("") + "</ol>"
          : '<p class="budget-rule">All cards on your build plan are only ' + esc(cost(1)) + ". So there is no roll.</p>")
        + (due.length && small.length ? '<p class="budget-rule">No roll, because only ' + esc(cost(1)) + ": " + esc(small.join(", ")) + ".</p>" : "")
        + '</section><aside class="budget-side" aria-label="Build plan"></aside></div>';
      drawSide();
      toTop(area.querySelector(".budget-bench-title"));
      round(due);
    }

    async function round(due) {
      if (due.length) await wait(calm() ? 250 : LEAD_MS);
      for (const id of due) {
        if (!el.isConnected) return;
        const row = area.querySelector('.budget-roll[data-id="' + id + '"]');
        row.classList.add("budget-active");
        row.scrollIntoView({ block: "nearest" });
        const pips = 1 + Math.floor(Math.random() * 6);
        await throwDie(row.querySelector(".budget-spot"), pips);
        const longer = pips >= 5, p = item(id);
        if (longer) s.plus[id] = 1;
        const text = "Rolled a " + pips + ". " + (longer ? "Takes " + cost(1) + " longer, now " + cost(length(id)) + "." : "Stays at " + cost(p.cost) + ".");
        row.querySelector(".budget-roll-text").textContent = text;
        row.classList.remove("budget-active");
        row.classList.add("budget-rolled");
        row.classList.toggle("budget-longer", longer);
        say(p.short + ": " + text);
        if (longer) drawSide(id);
        await wait(calm() ? 300 : READ_MS);
      }
      if (!el.isConnected) return;
      s.phase = "clear";
      drawSide();
      const verdict = area.querySelector(".budget-verdict");
      say(verdict.textContent);
      verdict.focus();
    }

    /* Result */
    function showResult() {
      const b = used(), rest = s.budget - b;
      /* Marking keeps an existing "no" (see mark below), so the preview must say so instead of "later". */
      const out = cards.filter((p) => !s.plan.includes(p.id));
      const left = out.filter((p) => State.value(p.id) !== "no").map((p) => p.short);
      const stayNo = out.filter((p) => State.value(p.id) === "no").map((p) => p.short);
      area.innerHTML = '<section class="budget-result"><h2 class="budget-big" tabindex="-1">How it would be built</h2><ol class="budget-rows">'
        + s.plan.map((id, i) => {
          const p = item(id);
          return '<li class="budget-row"><span class="budget-rnr">' + (i + 1) + '</span><span class="budget-rname">' + esc(p.short) + "<small>" + esc(p.title) + "</small></span>"
            + '<span class="budget-rcost">' + esc(cost(length(id))) + (s.plus[id] ? "<small>" + p.cost + " estimated, " + esc(cost(1)) + " more from the roll</small>" : "") + "</span></li>";
        }).join("") + "</ol>"
        + '<p class="budget-total"><span>Total</span><span>' + b + " of " + esc(cost(s.budget)) + "</span></p>"
        + (rest ? '<p class="budget-small">' + esc(cost(rest)) + " left.</p>" : "")
        + (left.length ? '<p class="budget-left-out">Not in, so later: ' + esc(left.join(", ")) + ".</p>" : "")
        + (stayNo.length ? '<p class="budget-left-out">Not in, stays no: ' + esc(stayNo.join(", ")) + ".</p>" : "")
        + '<p class="budget-sentence">These are estimates. Something will still turn out differently.</p>'
        + '<div class="budget-confirm"><button type="button" class="budget-main" data-a="mark">Mark this build plan</button>'
        + '<p class="budget-small">The cards on the build plan then count as yes, all other cards as later, unless you already said no there.'
        + " The order goes along. Oversized cards and items outside the game stay as they are.</p></div></section>";
      toTop(area.querySelector(".budget-big"));
    }

    function takeOff(id, button) {
      const i = s.plan.indexOf(id), neighbour = s.plan[i + 1] || s.plan[i - 1];
      s.plan.splice(i, 1);
      update();
      const target = neighbour ? area.querySelector('.budget-block[data-id="' + neighbour + '"] [data-a="' + button + '"]') : area.querySelector(".budget-side .budget-h2");
      if (target) target.focus();
    }

    function move(id, by) {
      const i = s.plan.indexOf(id), j = i + by;
      if (i < 0 || j < 0 || j >= s.plan.length) return;
      s.plan.splice(i, 1);
      s.plan.splice(j, 0, id);
      drawSide();
      say(item(id).short + " is now at position " + (j + 1) + " of " + s.plan.length + ".");
    }

    const action = {
      place(id) {
        const p = item(id);
        if (s.plan.includes(id)) {
          s.plan.splice(s.plan.indexOf(id), 1);
          say(p.short + " is no longer on the build plan.");
          update();
        } else if (p.cost <= s.budget - used()) {
          s.plan.push(id);
          say(p.short + " is now on the build plan.");
          update(id);
        }
      },
      up: (id) => move(id, -1),
      down: (id) => move(id, 1),
      drop: (id) => takeOff(id, "drop"),
      takeout(id) {
        s.removed.push({ id, at: s.plan.indexOf(id) });
        takeOff(id, "takeout");
      },
      putback(id) {
        const r = s.removed.find((x) => x.id === id);
        s.removed = s.removed.filter((x) => x !== r);
        /* Back in front of the first card that came after it when the dice were rolled. The index from the moment of
           taking out is not enough: take out two from the top and put both back, and their order would flip. */
        const base = s.base || [];
        const mine = base.indexOf(id);
        const next = mine < 0 ? -1 : s.plan.findIndex((x) => base.indexOf(x) > mine);
        const at = mine < 0 ? Math.min(r.at, s.plan.length) : next < 0 ? s.plan.length : next;
        s.plan.splice(at, 0, id);
        update();
        const target = area.querySelector('.budget-block[data-id="' + id + '"] [data-a="takeout"]');
        if (target) target.focus();
      },
      toplan: () => area.querySelector(".budget-side").scrollIntoView(),
      roll() {
        if (s.phase !== "plan" || !s.plan.length || used() > s.budget) return;
        s.phase = "rolling";
        s.base = s.plan.slice();
        showRolling();
      },
      next() {
        if (s.phase !== "clear" || used() > s.budget) return;
        s.phase = "result";
        showResult();
      },
      mark(_, button) {
        s.plan.forEach((id) => State.set(id, "yes"));
        cards.filter((p) => !s.plan.includes(p.id) && State.value(p.id) !== "no").forEach((p) => State.set(p.id, "later"));
        State.setOrder(s.plan);
        const row = button.closest(".budget-confirm");
        row.innerHTML = '<p class="budget-sentence" tabindex="-1" style="margin:0">Marked, it only counts in the chat. It now shows in the other ways too.</p>';
        const endArea = document.createElement("section");
        endArea.className = "budget-end-area";
        endArea.innerHTML = '<div class="budget-end-rest"></div><button type="button" class="budget-btn" data-a="restart">Start over</button>';
        row.closest(".budget-result").after(endArea);
        A.end(endArea.querySelector(".budget-end-rest"), "budget");
        row.firstChild.focus();
      },
      restart() {
        fresh();
        /* Playing again changes nothing about what is marked until a new plan is marked. You should see that. */
        if (State.order().length) {
          area.querySelector(".budget-intro").insertAdjacentHTML("afterend",
            '<p class="budget-intro"><strong>Your last plan stays marked until you mark a new one.</strong></p>');
        }
        toTop(area.querySelector(".budget-big"));
      },
    };

    root.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-a]");
      if (!b || b.getAttribute("aria-disabled") === "true") return;
      const h = action[b.dataset.a], d = b.closest("[data-id]");
      if (h) h(d ? d.dataset.id : null, b);
    });
    root.addEventListener("input", (e) => {
      if (e.target.dataset.a !== "budget") return;
      s.budget = +e.target.value;
      e.target.setAttribute("aria-valuetext", cost(s.budget));
      area.querySelector(".budget-number").innerHTML = number(s.budget);
      update();
    });
    root.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      const b = e.target.closest(".budget-block");
      if (!b || !b.hasAttribute("draggable")) return;
      e.preventDefault();
      move(b.dataset.id, e.key === "ArrowUp" ? -1 : 1);
    });

    /* Dragging with the mouse. The buttons and arrow keys can do the same. */
    const clearDrop = () => area.querySelectorAll("[data-drop]").forEach((x) => x.removeAttribute("data-drop"));
    root.addEventListener("dragstart", (e) => {
      const b = e.target.closest && e.target.closest(".budget-block");
      if (!b) return;
      dragged = b.dataset.id;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragged);
    });
    root.addEventListener("dragover", (e) => {
      const b = dragged && e.target.closest && e.target.closest(".budget-block");
      clearDrop();
      if (!b || b.dataset.id === dragged) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const r = b.getBoundingClientRect();
      b.dataset.drop = e.clientY > r.top + r.height / 2 ? "bottom" : "top";
    });
    root.addEventListener("drop", (e) => {
      const b = dragged && e.target.closest && e.target.closest(".budget-block");
      if (!b || b.dataset.id === dragged) return;
      e.preventDefault();
      const below = b.dataset.drop === "bottom";
      s.plan.splice(s.plan.indexOf(dragged), 1);
      s.plan.splice(s.plan.indexOf(b.dataset.id) + (below ? 1 : 0), 0, dragged);
      dragged = null;
      drawSide();
    });
    root.addEventListener("dragend", () => { dragged = null; clearDrop(); });

    function fresh() {
      s = { budget: START, plan: [], plus: {}, phase: "plan", removed: [] };
      showPlan();
    }
    fresh();
  };
})();
