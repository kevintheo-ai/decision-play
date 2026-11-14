#!/usr/bin/env python3
"""Browser smoke test: builds the example (or the test fixture) and clicks through every way once (headless Chromium).

Run: python3 tests/smoke.py [--keep] [--fixture]   (--keep leaves screenshots in the temp folder,
     --fixture uses tests/fixture even when example/content.json exists)
Needs: pip install playwright && playwright install chromium
Checks: no script errors, no sideways scrolling at 390 px, answers travel from way to way, the text for the chat is
right, images and audio are reachable. The expectations are derived from the content, so any valid content works.
Exit 0 = all green.
"""

import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import urllib.parse

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
SKILL = HERE.parent
EXAMPLE = SKILL / "example/content.json"
CONTENT = EXAMPLE if EXAMPLE.exists() and "--fixture" not in sys.argv else HERE / "fixture/content.json"
BUILD = SKILL / "scripts/build.py"
WORD = {"yes": "yes", "no": "no", "later": "later"}


def build(content, out, *extra):
    r = subprocess.run(
        [sys.executable, str(BUILD), str(content), "--out", str(out), *extra], capture_output=True, text=True
    )
    assert r.returncode == 0, r.stdout + r.stderr
    return out


def no_sideways(pg, where):
    wide = pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    assert wide <= 1, f"{where}: page scrolls sideways by {wide}px"


def word(p, w):
    return WORD.get(w) or next(o["text"] for o in p["options"] if o["id"] == w)


def has_cost(p):
    return not p.get("options") and isinstance(p.get("cost"), int) and p["cost"] > 0


def edition_target(a, p):
    """What taking an edition sets for an item, as the page does it."""
    if p["id"] in a.get("choices", {}):
        return a["choices"][p["id"]]
    if p["id"] in a["yes"]:
        return "yes"
    return "no" if p["proposal"] == "no" else "later"


def written(content, folder, name, change):
    """Writes a changed copy next to the original, so relative paths still resolve."""
    A = json.loads(content.read_text(encoding="utf-8"))
    change(A)
    p = content.parent / f".smoke-{name}.json"
    p.write_text(json.dumps(A, ensure_ascii=False), encoding="utf-8")
    folder.append(p)
    return p


def check_paper(pg, A, width):
    Z = A["paper"]
    pg.locator('#head-ways [data-way="paper"]').click()
    pg.wait_for_selector(".paper-kiosk")
    assert pg.locator(".paper-slot").count() == len(Z["editions"]) + (1 if Z.get("nothing") else 0)
    no_sideways(pg, f"paper {width}")
    a = Z["editions"][-1]
    pg.locator(f'[data-edition="{a["id"]}"]').click()
    pg.wait_for_selector(".paper-spread")
    no_sideways(pg, f"edition {width}")
    pg.locator(".paper-take").click()
    pg.wait_for_selector(".paper-result")
    text = pg.evaluate("State.text()")
    for i, p in enumerate(A["items"], 1):
        line = f"{i} {p['short']}: {word(p, edition_target(a, p))}"
        assert line in text, f"paper: '{line}' missing in\n{text}"
    assert "Still open" not in text, text


def check_budget(pg, A, width):
    pg.locator('#head-ways [data-way="budget"]').click()
    pg.wait_for_selector(".budget-cards")
    no_sideways(pg, f"budget {width}")
    start = A["budget"].get("start") or pg.evaluate("A.budget.start")
    left, placed = start, []
    for p in sorted((p for p in A["items"] if has_cost(p)), key=lambda p: p["cost"]):
        if p["cost"] <= left and len(placed) < 2:
            pg.locator(f'.budget-card[data-id="{p["id"]}"] .budget-place').click()
            left -= p["cost"]
            placed.append(p)
    assert placed, "no card fits the start budget"
    assert pg.evaluate("document.querySelectorAll('.budget-block').length") == len(placed)
    before_no = [p["id"] for p in A["items"] if pg.evaluate(f"State.value({json.dumps(p['id'])})") == "no"]
    pg.locator('[data-a="roll"]').click()
    pg.wait_for_selector('[data-a="next"], .budget-verdict-over', timeout=15000)
    while pg.locator(".budget-verdict-over").count():
        pg.locator('[data-a="takeout"]').first.click()
    pg.locator('[data-a="next"]').click()
    pg.locator('[data-a="mark"]').click()
    text = pg.evaluate("State.text()")
    assert "Order: " in text, text
    for pid in before_no:
        if pid not in [p["id"] for p in placed]:
            assert pg.evaluate(f"State.value({json.dumps(pid)})") == "no", f"budget overwrote no on {pid}"
    pg.wait_for_selector(".budget-end-rest pre")


def check_panels(pg, A, width):
    pg.locator('#head-ways [data-way="panels"]').click()
    pg.wait_for_selector(".panel-item")
    assert pg.locator(".panel-item").count() == len(A["items"])
    for img in pg.locator(".panel-frame img").all():
        img.scroll_into_view_if_needed()
    pg.wait_for_timeout(600)
    broken = pg.evaluate(
        "[...document.querySelectorAll('.panel-frame img')].filter(i => !i.complete || !i.naturalWidth).length"
    )
    assert broken == 0, f"{broken} images do not load"
    assert pg.locator(".panel-text-only", has_text="Image missing").count() == 0
    p = A["items"][0]
    v = pg.evaluate(f"State.value({json.dumps(p['id'])})")
    if v:
        sel = f'.panel-btn[data-id="{p["id"]}"][data-value="{v}"][aria-pressed="true"]'
        assert pg.locator(sel).count() == 1, "panels do not show the stored answer"
    no_sideways(pg, f"panels {width}")


def check_car(pg, A, page, width):
    pg.locator('#head-ways [data-way="car"]').click()
    n = len(A["items"])
    if A["car"].get("folder"):
        pg.wait_for_selector("#car-list li")
        assert pg.locator("#car-list li").count() == n + 2
        assert pg.locator("#car-list .car-ans").count() == n
        audio = pg.evaluate("A.car.pieces[1].url")
        assert (page.parent / urllib.parse.unquote(audio)).resolve().exists(), f"audio not found: {audio}"
    else:
        pg.wait_for_selector(".car-book")
        assert pg.locator(".car-piece").count() == n + 2
    no_sideways(pg, f"car {width}")


def check_overview(pg, A, width):
    pg.locator('#head-ways [data-way=""]').click()
    pg.wait_for_selector(".a-items")
    assert pg.locator(".a-item").count() == len(A["items"])
    found = next(((i, p) for i, p in reversed(list(enumerate(A["items"], 1))) if not p.get("options")), None)
    if found is None:  # only choice questions: nothing to click yes on, the count above is the check
        no_sideways(pg, f"overview {width}")
        return None, None
    i, p = found
    if pg.evaluate(f"State.value({json.dumps(p['id'])})") == "yes":
        pg.locator(f'.a-item:nth-child({i}) [data-w="yes"]').click()  # second click clears, then set again
    pg.locator(f'.a-item:nth-child({i}) [data-w="yes"]').click()
    line = f"{i} {p['short']}: yes"
    assert line in pg.evaluate("State.text()")
    assert line in pg.locator(".a-start-end pre").inner_text()
    no_sideways(pg, f"overview {width}")
    return i, p


def main():
    keep = "--keep" in sys.argv
    folder = pathlib.Path(tempfile.mkdtemp(prefix="decision-play-smoke-"))
    A = json.loads(CONTENT.read_text(encoding="utf-8"))
    ways = [w for w in ("paper", "budget", "panels", "car") if w in A]
    scratch = []
    try:
        full = build(CONTENT, folder / "full.html", "--way", ways[0]) if ways else build(CONTENT, folder / "full.html")
        script_page = None
        if "car" in A:
            # A second version without audio: In the Car then shows the script.
            no_audio = written(CONTENT, scratch, "no-audio", lambda X: X["car"].pop("folder", None))
            script_page = build(no_audio, folder / "script.html", "--way", "car")

        errors = []
        with sync_playwright() as pw:
            b = pw.chromium.launch(headless=True)
            for width in (1440, 390):
                ctx = b.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, w=width: errors.append(f"{w}px: {e}"))
                pg.on(
                    "console",
                    lambda m, w=width: errors.append(f"{w}px console: {m.text}") if m.type == "error" else None,
                )
                pg.goto(full.as_uri())
                pg.wait_for_selector("#head-ways button")
                if "paper" in ways:
                    check_paper(pg, A, width)
                if "budget" in ways:
                    check_budget(pg, A, width)
                if "panels" in ways:
                    check_panels(pg, A, width)
                if "car" in ways:
                    check_car(pg, A, full, width)
                i, p = check_overview(pg, A, width)
                if keep:
                    pg.screenshot(path=str(folder / f"overview-{width}.png"), full_page=True)

                # Rebuild with a changed question: only that answer drops, the others stay.
                other = next((q for q in A["items"] if p and q["id"] != p["id"]), None)
                if width == 1440 and other:
                    other_value = pg.evaluate(f"State.value({json.dumps(other['id'])})")

                    def change(X, pid=p["id"]):
                        next(q for q in X["items"] if q["id"] == pid)["about"] = "A new question."
                        if "car" in X:  # this step is about answers; old audio for a changed question is refused
                            X["car"].pop("folder", None)

                    changed = written(CONTENT, scratch, "changed", change)
                    build(changed, full, *(("--way", ways[0]) if ways else ()))
                    # Same title, session and date, so the same storage key.
                    pg.goto(full.as_uri())
                    pg.wait_for_selector("#head-ways button")
                    text = pg.evaluate("State.text()")
                    assert f"{i} {p['short']}:" not in text, text
                    assert pg.evaluate(f"State.value({json.dumps(other['id'])})") == other_value, text
                    build(CONTENT, full, *(("--way", ways[0]) if ways else ()))

                if script_page:
                    pg.goto(script_page.as_uri())
                    pg.wait_for_selector(".car-book")
                    assert pg.locator(".car-piece").count() == len(A["items"]) + 2
                    assert pg.locator(".car-part.b").count() == len(A["items"])
                    no_sideways(pg, f"script {width}")
                ctx.close()
            b.close()
        assert not errors, "\n".join(errors)
        print("smoke OK", CONTENT.relative_to(SKILL), folder if keep else "")
    finally:
        for p in scratch:
            p.unlink(missing_ok=True)
        if not keep:
            shutil.rmtree(folder, ignore_errors=True)


if __name__ == "__main__":
    main()
