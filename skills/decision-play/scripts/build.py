#!/usr/bin/env python3
"""Build a decision page: check content.json and turn it into one self-contained local HTML page.

Usage:
  python3 build.py CONTENT.json --out PAGE.html [--way paper|budget|panels|car] [--open]
  python3 build.py CONTENT.json --check                   check only, write nothing
  python3 build.py CONTENT.json --script TRACKS.json      write the In the Car script (tracks.json format)

Which ways end up on the page is decided by the content: every block (paper, budget, panels, car) is one way.
--way picks the way the page opens with. Paths in the content are absolute or relative to content.json.
Exit 0 = ok, 1 = content has errors (all of them are listed), 2 = usage error.
Standard library only.
"""

import argparse
import datetime
import hashlib
import html
import json
import math
import os
import pathlib
import re
import subprocess
import sys
import urllib.parse
import webbrowser

HERE = pathlib.Path(__file__).resolve().parent
TEMPLATE = HERE.parent / "template"

WAYS = ["paper", "budget", "panels", "car"]
STANDARD = ("yes", "no", "later")
ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,40}$")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp")
MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]

TOP = {"title", "session", "about", "date", "items", "unit", "committed", *WAYS}
ITEM_REQUIRED = ("id", "short", "title", "about", "proposal", "proposalWhy", "counter")
ITEM_TEXT = (
    "familiar",
    "why",
    "now",
    "after",
    "evidence",
    "costNote",
    "risk",
    "conflict",
    "regret",
    "ifYes",
    "ifNo",
    "spoken",
    "objection",
)
ITEM = set(ITEM_REQUIRED) | set(ITEM_TEXT) | {"cost", "options", "captions", "realImage"}


class Errors(list):
    def __call__(self, where, what):
        self.append(f"{where}: {what}")


def text_ok(f, where, value, required=True):
    if value is None:
        if required:
            f(where, "missing")
        return False
    if not isinstance(value, str) or not value.strip():
        f(where, "must be a non-empty text")
        return False
    return True


def one_line(f, where, value, comma=False):
    """Short fields sit on one line of the answer text: a line break would slip in an answer nobody clicked."""
    if isinstance(value, str):
        # Also the Unicode line and paragraph separators: pasted into a chat they break the line just the same.
        if any(c in value for c in "\n\r\x0b\x0c\x85  "):
            f(where, "line break, this field sits on one line of the answer text")
        if comma and "," in value:
            f(where, "comma, in the order line the comma separates the items")


def path(base, value):
    p = pathlib.Path(value).expanduser()
    return p if p.is_absolute() else (base / p).resolve()


def image_of(folder, stem):
    for ext in IMAGE_EXT:
        p = folder / (stem + ext)
        if p.exists():
            return p
    return None


def today_text():
    d = datetime.date.today()
    return f"{MONTHS[d.month - 1]} {d.day}, {d.year}"


def answers(p):
    if isinstance(p.get("options"), list) and p["options"]:
        # Broken entries are reported by check(); here only valid objects count, so the checker never crashes.
        return [o.get("id") for o in p["options"] if isinstance(o, dict)] + ["later"]
    return list(STANDARD)


def is_count(v):
    return isinstance(v, int) and not isinstance(v, bool) and v > 0


def has_cost(p):
    return not p.get("options") and is_count(p.get("cost"))


def item_version(p, unit):
    """Fingerprint of what the user decides on: wording, options, cost and unit. A rebuild keeps an answer only while
    this stays the same; key order inside the options does not count, the explanation of the unit does not either."""
    u = [unit.get("one"), unit.get("many")] if has_cost(p) and isinstance(unit, dict) else None
    what = [p.get("short"), p.get("title"), p.get("about"), p.get("options"), p.get("cost") if has_cost(p) else None, u]
    return hashlib.sha1(
        json.dumps(what, ensure_ascii=False, sort_keys=True).encode(), usedforsecurity=False
    ).hexdigest()[:10]


def storage_key(title, session, date):
    """Browser storage key of a page: the same while title, session and date stay the same."""
    return hashlib.sha1(json.dumps([title, session, date]).encode(), usedforsecurity=False).hexdigest()[:12]


def check(A, base, way):
    """Checks the content and returns (errors, notes, ways). Errors stop the build."""
    f, notes = Errors(), []
    if not isinstance(A, dict):
        f("content", "must be a JSON object")
        return f, notes, []
    for k in A:
        if k not in TOP and not k.startswith("_"):
            f(k, "unknown field (typo?)")
    for k in ("title", "session", "about"):
        text_ok(f, k, A.get(k))
    one_line(f, "title", A.get("title"))
    one_line(f, "session", A.get("session"))
    if "date" in A:
        text_ok(f, "date", A["date"])

    items = A.get("items")
    if not isinstance(items, list) or not items:
        f("items", "needs at least one item")
        items = []
    ids, shorts = set(), set()
    for i, p in enumerate(items):
        where = f"items[{i}]"
        if not isinstance(p, dict):
            f(where, "must be an object")
            continue
        where = f"items[{i}] {p.get('id', '?')}"
        for k in p:
            if k not in ITEM:
                f(where, f"unknown field {k} (typo?)")
        for k in ITEM_REQUIRED:
            text_ok(f, f"{where}.{k}", p.get(k))
        one_line(f, f"{where}.short", p.get("short"), comma=True)
        one_line(f, f"{where}.title", p.get("title"))
        for k in ITEM_TEXT:
            if k in p:
                text_ok(f, f"{where}.{k}", p[k])
        pid = p.get("id")
        if isinstance(pid, str):
            if not ID.match(pid):
                f(where, "id only a-z, 0-9 and hyphen, at most 41 characters")
            if pid == "constructor":
                # The page looks ids up in plain JS objects; 'constructor' would hit their built-in function.
                f(where, "id 'constructor' is reserved, please pick another")
            if pid in ids:
                f(where, "id appears twice")
            ids.add(pid)
        short = p.get("short")
        if isinstance(short, str):
            # The answer text names items by short (Order line); two equal shorts would make it ambiguous.
            if short.strip().lower() in shorts:
                f(where, "short appears twice, give each item its own short name")
            shorts.add(short.strip().lower())
        opt = p.get("options")
        if opt is not None:
            if not isinstance(opt, list) or not 2 <= len(opt) <= 4:
                f(where, "options needs 2 to 4 entries")
            else:
                oids, otexts = set(), {"yes", "no", "later"}
                for j, o in enumerate(opt):
                    if not isinstance(o, dict) or set(o) - {"id", "text"}:
                        f(f"{where}.options[{j}]", "only id and text")
                        continue
                    oid = o.get("id")
                    if not isinstance(oid, str) or not ID.match(oid) or oid in STANDARD or oid in oids:
                        f(f"{where}.options[{j}]", "id missing, duplicate or called yes/no/later")
                    elif oid == "constructor":
                        # Same reason as for item ids: answers are looked up in plain JS objects.
                        f(f"{where}.options[{j}]", "id 'constructor' is reserved, please pick another")
                    if isinstance(oid, str):
                        oids.add(oid)
                    text_ok(f, f"{where}.options[{j}].text", o.get("text"))
                    one_line(f, f"{where}.options[{j}].text", o.get("text"))
                    # The answer text carries the option text, not its id: two equal texts (or one reading "later")
                    # would make the pick unreadable after copying.
                    text = o.get("text")
                    if isinstance(text, str):
                        if text.strip().lower() in otexts:
                            f(
                                f"{where}.options[{j}]",
                                "text appears twice or reads yes/no/later, the answer would be ambiguous",
                            )
                        otexts.add(text.strip().lower())
            if "cost" in p:
                f(where, "cost does not fit a choice question")
        if "cost" in p and not has_cost(p) and opt is None:
            f(where, "cost must be a whole number from 1")
        if isinstance(p.get("proposal"), str) and p["proposal"] not in answers(p):
            f(where, f"proposal must be one of {', '.join(map(str, answers(p)))}")
        if "captions" in p:
            c = p["captions"]
            if not isinstance(c, list) or len(c) != 4:
                f(where, "captions needs exactly 4 texts")
            else:
                for j, t in enumerate(c):
                    text_ok(f, f"{where}.captions[{j}]", t)
        if (
            "realImage" in p
            and text_ok(f, f"{where}.realImage", p["realImage"])
            and not path(base, p["realImage"]).exists()
        ):
            f(where, f"realImage not found: {p['realImage']}")

    item = {p["id"]: p for p in items if isinstance(p, dict) and isinstance(p.get("id"), str)}

    u = A.get("unit")
    if u is not None:
        if not isinstance(u, dict) or set(u) - {"one", "many", "explain"}:
            f("unit", "only one, many, explain")
        else:
            for k in ("one", "many"):
                text_ok(f, f"unit.{k}", u.get(k))
            if "explain" in u:
                text_ok(f, "unit.explain", u["explain"])
    c = A.get("committed")
    committed_cost = isinstance(c, list) and any(isinstance(x, dict) and "cost" in x for x in c)
    if (any(has_cost(p) for p in items if isinstance(p, dict)) or committed_cost) and u is None:
        f("unit", "items or committed entries have a cost, so the unit is needed (for example build night)")

    if c is not None:
        if not isinstance(c, list):
            f("committed", "must be a list")
        else:
            for i, x in enumerate(c):
                if not isinstance(x, dict) or set(x) - {"name", "text", "cost"}:
                    f(f"committed[{i}]", "only name, text, cost")
                    continue
                text_ok(f, f"committed[{i}].name", x.get("name"))
                text_ok(f, f"committed[{i}].text", x.get("text"))
                if "cost" in x and not is_count(x["cost"]):
                    f(f"committed[{i}].cost", "whole number from 1")

    ways = [w for w in WAYS if w in A]
    if way and way not in ways:
        f("--way", f"{way} needs the block '{way}' in the content")

    if "paper" in A:
        check_paper(A["paper"], item, base, f)
    if "budget" in A:
        check_budget(A, items, f, notes)
    if "panels" in A:
        check_panels(A["panels"], items, base, f)
    if "car" in A:
        # Only text ids: a broken id is reported above and would make the sorted comparison crash.
        versions = {
            p["id"]: item_version(p, A.get("unit"))
            for p in items
            if isinstance(p, dict) and isinstance(p.get("id"), str)
        }
        check_car(A["car"], base, f, versions)
    return f, notes, ways


def check_paper(Z, item, base, f):
    if not isinstance(Z, dict):
        f("paper", "must be an object")
        return
    for k in Z:
        if k not in {"prefix", "name", "place", "date", "intro", "editions", "nothing"}:
            f(f"paper.{k}", "unknown field")
    for k in ("name", "place", "date", "intro"):
        text_ok(f, f"paper.{k}", Z.get(k))
    if "prefix" in Z:
        text_ok(f, "paper.prefix", Z["prefix"])
    eds = Z.get("editions")
    if not isinstance(eds, list) or not 2 <= len(eds) <= 3:
        f("paper.editions", "needs 2 or 3 editions")
        return
    seen = set()
    for i, a in enumerate(eds):
        where = f"paper.editions[{i}]"
        if not isinstance(a, dict):
            f(where, "must be an object")
            continue
        for k in a:
            if k not in {"id", "name", "headline", "lede", "story", "yes", "choices", "image", "caption"}:
                f(f"{where}.{k}", "unknown field")
        for k in ("id", "name", "headline", "lede", "story"):
            text_ok(f, f"{where}.{k}", a.get(k))
        aid = a.get("id")
        if isinstance(aid, str) and (not ID.match(aid) or aid in seen or aid == "nothing"):
            f(where, "id invalid, duplicate or 'nothing'")
        if isinstance(aid, str):
            seen.add(aid)
        yes = a.get("yes")
        if not isinstance(yes, list) or not all(isinstance(x, str) for x in yes):
            f(f"{where}.yes", "list of item ids (texts) that are yes in this edition")
            yes = [x for x in yes if isinstance(x, str)] if isinstance(yes, list) else []
        for pid in yes:
            p = item.get(pid)
            if p is None:
                f(f"{where}.yes", f"unknown item {pid}")
            elif p.get("options"):
                f(f"{where}.yes", f"{pid} is a choice question, it belongs under choices")
        if len(set(yes)) != len(yes):
            f(f"{where}.yes", "item listed twice")
        ch = a.get("choices", {})
        if not isinstance(ch, dict):
            f(f"{where}.choices", "object item id -> answer")
        else:
            for pid, w in ch.items():
                p = item.get(pid)
                if p is None:
                    f(f"{where}.choices", f"unknown item {pid}")
                elif not p.get("options"):
                    # Otherwise the sentence after taking it is wrong ("what is in it is yes, else ...").
                    f(f"{where}.choices.{pid}", "choices only for choice questions; yes items belong under yes")
                elif w not in answers(p):
                    f(f"{where}.choices.{pid}", f"must be one of {', '.join(map(str, answers(p)))}")
                elif pid in yes:
                    f(f"{where}.choices.{pid}", "already listed under yes")
        if "image" in a and text_ok(f, f"{where}.image", a["image"]) and not path(base, a["image"]).exists():
            f(f"{where}.image", f"not found: {a['image']}")
        if "caption" in a:
            text_ok(f, f"{where}.caption", a["caption"])
    n = Z.get("nothing")
    if n is not None:
        if not isinstance(n, dict) or set(n) - {"name", "headline", "lede", "story"}:
            f("paper.nothing", "only name, headline, lede, story")
        else:
            for k in ("name", "headline", "lede", "story"):
                text_ok(f, f"paper.nothing.{k}", n.get(k))


def check_budget(A, items, f, notes):
    B = A["budget"]
    before = len(f)  # only errors of this block stop the computation below, so all errors show in one run
    for p in items:
        # In the plan the name sits on one line next to three buttons; longer than about 14 characters gets cut.
        if isinstance(p, dict) and has_cost(p) and isinstance(p.get("short"), str) and len(p["short"]) > 14:
            notes.append(f"budget {p.get('id')}: short '{p['short']}' is long, the build plan cuts it off")
    if not isinstance(B, dict) or set(B) - {"min", "max", "start", "title", "intro"}:
        f("budget", "only min, max, start, title, intro")
        return
    for k in ("title", "intro"):
        if k in B:
            text_ok(f, f"budget.{k}", B[k])
    if A.get("unit") is None:
        f("budget", "needs the unit (for example build night)")
    with_cost = [p for p in items if isinstance(p, dict) and has_cost(p)]
    if len(with_cost) < 2:
        f("budget", "needs at least 2 yes/no items with a cost")
    for k in ("min", "max", "start"):
        if k in B and not is_count(B[k]):
            f(f"budget.{k}", "whole number from 1")
    if len(f) > before:
        return
    total = sum(p["cost"] for p in with_cost)
    lo = B.get("min", 1)
    hi = B.get("max", max(lo + 1, min(20, total - 1)))
    st = B.get("start", min(hi, max(lo, round(total * 0.4))))
    if not lo <= st <= hi:
        f("budget", f"min <= start <= max must hold (now {lo}, {st}, {hi})")
    if hi > 30:
        f("budget.max", "at most 30, otherwise the slider gets unreadable")
    if sum(1 for p in with_cost if p["cost"] <= hi) < 2:
        f("budget.max", f"at least 2 items must fit into {hi}, otherwise there is nothing to play")
    B.update({"min": lo, "max": hi, "start": st})


def check_panels(BI, items, base, f):
    if not isinstance(BI, dict) or set(BI) - {"folder", "legend"}:
        f("panels", "only folder and legend")
        return
    if "legend" in BI:
        text_ok(f, "panels.legend", BI["legend"])
    if not text_ok(f, "panels.folder", BI.get("folder")):
        return
    folder = path(base, BI["folder"])
    if not folder.is_dir():
        f("panels.folder", f"folder not found: {folder}")
        return
    count = 0
    for p in items:
        if not isinstance(p, dict) or "captions" not in p:
            continue
        count += 1
        for n in (1, 2, 3):
            if image_of(folder, f"{p.get('id')}{n}") is None:
                f(f"panels {p.get('id')}", f"image {p.get('id')}{n} (jpg, png or webp) missing in {folder}")
    if not count:
        f("panels", "no item has captions")


def check_car(AU, base, f, versions):
    item_ids = list(versions)
    if not isinstance(AU, dict) or set(AU) - {"folder", "voice", "note", "pronounce"}:
        f("car", "only folder, voice, note, pronounce")
        return
    for k in ("voice", "note"):
        if k in AU:
            text_ok(f, f"car.{k}", AU[k])
    if "pronounce" in AU and not (
        isinstance(AU["pronounce"], dict)
        and all(isinstance(k, str) and k.strip() and isinstance(v, str) for k, v in AU["pronounce"].items())
    ):
        f("car.pronounce", 'object word -> how it is spoken, for example {"v2": "version two"}')
    if "folder" in AU and text_ok(f, "car.folder", AU["folder"]):
        o = path(base, AU["folder"])
        for n in ("tracks.json", "done.json"):
            if not (o / n).exists():
                f("car.folder", f"{n} missing in {o} (render the audio first or leave folder out)")
                continue
            # Check the structure here, otherwise only the build would crash with a KeyError.
            try:
                d = json.loads((o / n).read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError) as e:
                f(f"car.folder {n}", f"not readable: {e}")
                continue
            if n == "tracks.json":
                ok = (
                    isinstance(d, dict)
                    and isinstance(d.get("tracks"), list)
                    and all(
                        isinstance(t, dict)
                        and isinstance(t.get("nr"), int)
                        and all(isinstance(t.get(k), str) for k in ("title", "file"))
                        for t in d["tracks"]
                    )
                )
                if not ok:
                    f(f"car.folder {n}", 'expected {"tracks": [{"nr", "title", "file", ...}]}')
                else:
                    # Audio made for an older version of the list would put answers on the wrong item.
                    audio_ids = [tr["id"] for tr in d["tracks"] if tr.get("id")]
                    # Audio without ids (older or foreign script) cannot be matched either: --script always writes ids.
                    if sorted(map(str, audio_ids)) != sorted(item_ids):
                        f(
                            f"car.folder {n}",
                            "audio no longer matches the content (other items), write and render the script again",
                        )
                    # Same ids but the question changed since the audio was made: the user would answer the old one.
                    for tr in d["tracks"]:
                        if tr.get("version") and tr.get("id") in versions and tr["version"] != versions[tr["id"]]:
                            f(
                                f"car.folder {n}",
                                f"audio for {tr['id']} is older than the question, write and render again",
                            )
                    # A missing piece would leave the page silently shorter than the script.
                    for tr in d["tracks"]:
                        if not (o / tr["file"]).exists():
                            f(f"car.folder {n}", f"audio file missing: {tr['file']}")
            elif not (
                isinstance(d, list)
                and all(
                    isinstance(x, dict)
                    and isinstance(x.get("nr"), int)
                    and isinstance(x.get("duration", 0), (int, float))
                    and math.isfinite(x.get("duration", 0))
                    for x in d
                )
            ):
                f(f"car.folder {n}", 'expected [{"nr", "duration"}, ...]')


ONES = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
]
TENS = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"}


def num_word(n):
    """For spoken sentences: a voice does not always read digits well."""
    if n < 20:
        return ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return TENS[t] + ("-" + ONES[o] if o else "")
    if n < 1000:
        h, r = divmod(n, 100)
        return ONES[h] + " hundred" + (" " + num_word(r) if r else "")
    if n < 1_000_000:
        t, r = divmod(n, 1000)
        return num_word(t) + " thousand" + (" " + num_word(r) if r else "")
    return str(n)


# Whole numbers (also 5,000), not part of a word or a decimal number.
NUMBER = re.compile(r"(?<![\w.,$])(\d{1,3}(?:,\d{3})+|\d+)(?![\w]|[.,:]\d)")
MONTH_BEFORE = re.compile(r"(?:" + "|".join(MONTHS) + r")\s$")


def speak_numbers(t):
    """Written fields carry digits, spoken they sound better as words. Day numbers after a month name and years
    stay digits, a voice reads those well; percent is written out."""

    def word(m):
        digits = m.group(1)
        n = int(digits.replace(",", ""))
        # ponytail: years are guessed as 1900-2100, a count like "2000 users" stays digits too
        if MONTH_BEFORE.search(t[: m.start()]) or ("," not in digits and 1900 <= n <= 2100):
            return digits
        return num_word(n)

    t = NUMBER.sub(word, t)
    return re.sub(r"\s?%", " percent", t)


def join_and(names):
    return names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]


def script(A):
    """What the voice says: intro, one piece per item (explanation, counter voice, proposal), closing.
    Same format as tracks.json of a rendered audio version, so a text-to-speech step can read it."""
    say_as = (A.get("car") or {}).get("pronounce", {})

    # One pass, longest word first: otherwise a word already replaced would be replaced again.
    pattern = (
        re.compile(r"(?<!\w)(" + "|".join(sorted(map(re.escape, say_as), key=len, reverse=True)) + r")(?!\w)")
        if say_as
        else None
    )

    def spk(t):
        if pattern:
            t = pattern.sub(lambda m: say_as[m.group(1)], t)
        return speak_numbers(t)

    def word(p, w):
        if w in STANDARD:
            return w
        return next(o["text"] for o in p["options"] if o["id"] == w)

    items = A["items"]
    n = len(items)
    tracks = [
        {
            "nr": 1,
            "title": "Intro",
            "file": "01 Intro.mp3",
            "parts": [
                {
                    "voice": "a",
                    "text": spk(
                        f"Hi. {A['about']} There {'is one item' if n == 1 else 'are ' + num_word(n) + ' items'}. "
                        "Each item is a short piece. Use the next button to skip ahead. "
                        "You don't need to remember anything or say anything. Decide once you have parked."
                    ),
                }
            ],
        }
    ]
    for i, p in enumerate(items, 1):
        if p.get("spoken"):
            explanation = p["spoken"]
        else:
            parts = [p["about"], p.get("why", "")]
            if p.get("options"):
                parts.append("The choices are: " + join_and([o["text"] for o in p["options"]]) + ".")
            if has_cost(p) and A.get("unit"):
                u = A["unit"]
                amount = f"{num_word(p['cost'])} {u['one'] if p['cost'] == 1 else u['many']}"
                parts.append(f"The estimated cost is {amount}.")
            explanation = " ".join(t for t in parts if t)
        # counter speaks against the proposal: for yes against the item, for no for it, otherwise against the pick.
        prefix = {"yes": "Against it: ", "no": "For it: "}.get(p["proposal"], "Against my proposal: ")
        objection = p.get("objection") or prefix + p["counter"]
        short = re.sub(r"[^\w -]", "", p["short"]).strip()
        tracks.append(
            {
                "nr": i + 1,
                "id": p["id"],
                "version": item_version(p, A.get("unit")),
                "title": f"Item {i}: {p['short']}",
                "file": f"{i + 1:02d} Item {i} {short}.mp3",
                "parts": [
                    {"voice": "a", "text": spk(f"Item {num_word(i)}: {p['short']}. {explanation}")},
                    {"voice": "b", "text": spk(objection)},
                    {
                        "voice": "a",
                        "text": spk(
                            f"My proposal: {word(p, p['proposal'])}. {p['proposalWhy']} "
                            f"That was item {num_word(i)}, {p['short']}."
                        ),
                    },
                ],
            }
        )
    names = [p["short"] for p in items]
    tracks.append(
        {
            "nr": n + 2,
            "title": "Closing",
            "file": f"{n + 2:02d} Closing.mp3",
            "parts": [
                {
                    "voice": "a",
                    "text": spk(
                        f"That {'was the one item' if n == 1 else 'were all ' + num_word(n) + ' items'}: {join_and(names)}. "
                        "Once you have parked, just tell me the numbers, for example: one yes, two later. "
                        "You don't have to do everything at once. And tell me if this was pleasant to listen to."
                    ),
                }
            ],
        }
    )
    return {"title": A["title"], "tracks": tracks}


def url(out_dir, file):
    """Relative address from the page to the file, so images and audio load without a server."""
    try:
        rel = os.path.relpath(pathlib.Path(file).resolve(), out_dir)
    except ValueError:  # another drive on Windows: no relative path exists, a file address still works locally
        return pathlib.Path(file).resolve().as_uri()
    return urllib.parse.quote(pathlib.Path(rel).as_posix(), safe="/")


def page(A, base, ways, start, out):
    """Puts content and scripts into the template. Images and audio stay files, the page links to them relatively."""
    out_dir = out.parent.resolve()
    D = json.loads(json.dumps(A))  # copy, paths become addresses
    D["date"] = D.get("date") or today_text()
    D["ways"] = ways
    D["start"] = start or (ways[0] if ways else "")
    # Browser storage key: answers survive a rebuild on the same day; if a question changes, only it loses its answer (version).
    D["key"] = storage_key(D["title"], D["session"], D["date"])
    for p in D["items"]:
        p["version"] = item_version(p, A.get("unit"))
        if "realImage" in p:
            p["realImageUrl"] = url(out_dir, path(base, p.pop("realImage")))
    if "panels" in D:
        folder = path(base, D["panels"].pop("folder"))
        for p in D["items"]:
            if "captions" in p:
                p["imageUrls"] = [url(out_dir, image_of(folder, f"{p['id']}{n}")) for n in (1, 2, 3)]
    if "paper" in D:
        for a in D["paper"]["editions"]:
            if "image" in a:
                a["image"] = url(out_dir, path(base, a["image"]))
    if "car" in D:
        D["car"]["script"] = script(A)["tracks"]
        if "folder" in D["car"]:
            o = path(base, D["car"].pop("folder"))
            plan = json.loads((o / "tracks.json").read_text(encoding="utf-8"))
            done = {x["nr"]: x for x in json.loads((o / "done.json").read_text(encoding="utf-8"))}
            # Older audio versions carry no id: match only when the title fits the item at this position exactly.
            titles = {f"Item {i}: {p['short']}": p["id"] for i, p in enumerate(A["items"], 1)}
            D["car"]["pieces"] = [
                {
                    "nr": t["nr"],
                    "id": t.get("id") or titles.get(t["title"]),
                    "title": t["title"],
                    "duration": done.get(t["nr"], {}).get("duration", 0),
                    "url": url(out_dir, o / t["file"]),
                }
                for t in plan["tracks"]
                if (o / t["file"]).exists()
            ]

    scripts = ["base.js", "state.js"] + [f"ways/{w}.js" for w in ways] + ["frame.js"]
    parts = []
    for s in scripts:
        code = (TEMPLATE / s).read_text(encoding="utf-8")
        if "</script" in code.lower():
            raise SystemExit(f"template {s} contains </script, that breaks the page")
        parts.append(f"<script>/* {s} */\n{code}</script>")
    data = json.dumps(D, ensure_ascii=False, allow_nan=False).replace("<", "\\u003c")
    template = (TEMPLATE / "page.html").read_text(encoding="utf-8")
    return (
        template.replace("/*@TITLE@*/", html.escape(A["title"]))
        .replace("/*@CONTENT@*/", data)
        .replace("<!--@SCRIPTS@-->", "\n".join(parts))
    )


def open_file(p):
    if sys.platform == "darwin":
        subprocess.run(["open", str(p)], check=False)
    elif sys.platform.startswith("linux"):
        subprocess.run(["xdg-open", str(p)], check=False)
    else:
        webbrowser.open(p.as_uri())


def main(argv=None):
    ap = argparse.ArgumentParser(description="Build a decision page from content.json")
    ap.add_argument("content")
    ap.add_argument("--out", help="HTML file to write")
    ap.add_argument("--way", choices=WAYS, help="way the page opens with")
    ap.add_argument("--check", action="store_true", help="check only")
    ap.add_argument("--script", help="write tracks.json for In the Car")
    ap.add_argument("--open", action="store_true", help="open the page afterwards")
    a = ap.parse_args(argv)
    if not (a.out or a.check or a.script):
        ap.error("give --out, --check or --script")

    source = pathlib.Path(a.content).expanduser().resolve()
    try:
        A = json.loads(source.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        print(f"ERROR: {source} not readable: {e}", file=sys.stderr)
        return 2
    errors, notes, ways = check(A, source.parent, a.way)
    for n in notes:
        print("NOTE", n)
    if errors:
        print(f"ERRORS ({len(errors)}):")
        for x in errors:
            print("  -", x)
        return 1
    print(f"OK: {len(A['items'])} items, ways: {', '.join(ways) or 'overview only'}")
    if a.check:
        return 0  # check only means: write nothing, even if --out or --script come along
    if a.script:
        out = pathlib.Path(a.script).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(script(A), ensure_ascii=False, indent=1), encoding="utf-8")
        print("Script:", out)
    if a.out:
        out = pathlib.Path(a.out).expanduser()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(page(A, source.parent, ways, a.way, out), encoding="utf-8")
        print("Page:", out.resolve())
        if a.open:
            open_file(out.resolve())
    return 0


if __name__ == "__main__":
    sys.exit(main())
