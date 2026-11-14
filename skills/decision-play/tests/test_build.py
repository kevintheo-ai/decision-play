#!/usr/bin/env python3
"""Checks of build.py: the fixture passes, typical mistakes are reported, the script is right.
Run: python3 tests/test_build.py   (or pytest)"""

import copy
import json
import pathlib
import sys
import tempfile

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "scripts"))
import build  # noqa: E402

BASE = HERE / "fixture"
FIXTURE = json.loads((BASE / "content.json").read_text(encoding="utf-8"))


def errors(A, way=None):
    f, _, _ = build.check(copy.deepcopy(A), BASE, way)
    return "\n".join(f)


def changed(**change):
    """Copy of the fixture with changes; a__0__b sets A["a"][0]["b"], None removes the key."""
    A = copy.deepcopy(FIXTURE)
    for key, value in change.items():
        target = A
        parts = key.split("__")
        for t in parts[:-1]:
            target = target[int(t)] if t.isdigit() else target[t]
        last = int(parts[-1]) if parts[-1].isdigit() else parts[-1]
        if value is None:
            target.pop(last)
        else:
            target[last] = value
    return A


def tmp():
    return pathlib.Path(tempfile.mkdtemp())


def test_fixture_passes():
    f, _, ways = build.check(copy.deepcopy(FIXTURE), BASE, "paper")
    assert not f, f
    assert ways == ["paper", "budget", "panels", "car"]


def test_typo_in_field():
    assert "unknown field proposalwhy" in errors(changed(items__0__proposalwhy="x"))


def test_required_field_missing():
    assert "counter: missing" in errors(changed(items__0__counter=None))


def test_proposal_must_fit():
    assert "proposal must be one of" in errors(changed(items__0__proposal="maybe"))


def test_choice_question():
    A = changed(items__0__options=[{"id": "a", "text": "A"}, {"id": "b", "text": "B"}], items__0__proposal="a")
    A["items"][0].pop("cost")
    A["car"].pop("folder")  # the fixture audio belongs to the yes/no version of this item
    # A choice question may not sit under yes in any edition, only under choices.
    assert "pin is a choice question" in errors(A)
    for a in A["paper"]["editions"]:
        a["yes"] = [i for i in a["yes"] if i != "pin"]
    A["budget"]["max"] = 8  # without pin only search and archive fit
    assert not errors(A), errors(A)
    A["paper"]["editions"][0]["choices"] = {"pin": "yes"}
    assert "choices.pin: must be one of a, b, later" in errors(A)


def test_budget_needs_unit_and_costs():
    assert "needs the unit" in errors(changed(unit=None))
    A = copy.deepcopy(FIXTURE)
    for p in A["items"]:
        p.pop("cost", None)
    assert "at least 2 yes/no items with a cost" in errors(A)
    assert "min <= start <= max" in errors(changed(budget__start=40))


def test_panels_folder_missing():
    assert "folder not found" in errors(changed(panels__folder="/does/not/exist"))


def test_way_without_block():
    assert "paper needs the block" in errors(changed(paper=None), "paper")


def test_script():
    d = build.script(copy.deepcopy(FIXTURE))["tracks"]
    assert len(d) == len(FIXTURE["items"]) + 2
    assert d[1]["id"] == "pin" and [t["voice"] for t in d[1]["parts"]] == ["a", "b", "a"]
    assert d[1]["parts"][0]["text"].startswith("Item one: Pinning.")
    assert "My proposal: yes." in d[1]["parts"][2]["text"]
    assert "version two names" in d[2]["parts"][0]["text"]
    assert "My proposal: Cloud folder." in d[5]["parts"][2]["text"]
    assert build.num_word(21) == "twenty-one" and build.num_word(30) == "thirty"


def test_counter_direction_in_script():
    # Without an own objection: for yes against, for no for, otherwise against the proposal.
    parts = {t["id"]: t["parts"][1]["text"] for t in build.script(copy.deepcopy(FIXTURE))["tracks"] if t.get("id")}
    assert parts["pin"].startswith("Against it:")
    assert parts["archive"].startswith("For it:")
    assert parts["phone"].startswith("Against my proposal:")
    assert parts["storage"].startswith("Against my proposal:")


def test_broken_input_does_not_crash():
    A = changed(items__0__options=["a", "b"], items__0__proposal="a")
    A["items"][0].pop("cost")
    assert "only id and text" in errors(A)
    A = copy.deepcopy(FIXTURE)
    A["paper"]["editions"][0]["id"] = ["x"]
    A["paper"]["editions"][1]["yes"] = [{"a": 1}]
    f = errors(A)
    assert "paper.editions[0]" in f and "paper.editions[1].yes" in f
    assert "short" in errors(changed(items__0__short=123))
    # options as a truthy non-list must be reported, not crash the check.
    A = changed(items__0__options=5, items__0__proposal="yes")
    A["items"][0].pop("cost")
    assert "options needs 2 to 4 entries" in errors(A)
    # An item without a text id next to an audio folder must not crash the audio comparison.
    assert "items[0]" in errors(changed(items__0__id=None))


def test_broken_audio_folder_is_an_error():
    folder = tmp()
    (folder / "tracks.json").write_text("{}")
    (folder / "done.json").write_text("not json")
    f = errors(changed(car__folder=str(folder)))
    assert "tracks.json" in f and "done.json" in f


def test_committed_cost_not_a_bool():
    assert "committed[0].cost" in errors(changed(committed__0__cost=True))


def test_missing_audio_file_is_an_error():
    folder = tmp()
    (folder / "tracks.json").write_text(json.dumps({"tracks": [{"nr": 1, "title": "Intro", "file": "01.mp3"}]}))
    (folder / "done.json").write_text(json.dumps([{"nr": 1, "duration": 12.0}]))
    assert "01.mp3" in errors(changed(car__folder=str(folder)))


def test_committed_cost_needs_unit():
    A = copy.deepcopy(FIXTURE)
    A.pop("unit")
    A.pop("budget")
    for p in A["items"]:
        p.pop("cost", None)
    assert "unit" in errors(A)


def test_check_writes_nothing():
    out = tmp() / "page.html"
    assert build.main([str(BASE / "content.json"), "--check", "--out", str(out)]) == 0
    assert not out.exists(), "--check must not write anything"


def test_audio_must_match_content():
    folder = tmp()
    (folder / "01.mp3").write_bytes(b"x")
    tracks = {"tracks": [{"nr": 1, "id": "not-there", "title": "Item 1: X", "file": "01.mp3"}]}
    (folder / "tracks.json").write_text(json.dumps(tracks))
    (folder / "done.json").write_text(json.dumps([{"nr": 1, "duration": 3.0}]))
    assert "no longer matches" in errors(changed(car__folder=str(folder)))
    # Audio without any item ids cannot be matched to the items; answers would land nowhere.
    tracks["tracks"][0].pop("id")
    (folder / "tracks.json").write_text(json.dumps(tracks))
    assert "no longer matches" in errors(changed(car__folder=str(folder)))


def test_unicode_line_separators_are_line_breaks():
    for sep in (" ", " ", "\x85"):
        assert "line break" in errors(changed(items__0__short="FAQ" + sep + "2 Archive: yes"))


def test_placeholder_in_content_does_not_break_the_page():
    out = tmp() / "page.html"
    A = changed(about="see <!--@SCRIPTS@--> and /*@CONTENT@*/ and /*@TITLE@*/")
    src = tmp() / "content.json"
    src.write_text(json.dumps(A))
    for d in ("panels", "car", "real"):
        if (BASE / d).exists():
            (src.parent / d).symlink_to(BASE / d)
    assert build.main([str(src), "--out", str(out)]) == 0
    text = out.read_text(encoding="utf-8")
    data = json.loads(text.split('id="content">', 1)[1].split("</script>", 1)[0])
    assert data["about"] == A["about"]


def test_version_follows_what_was_decided():
    p = copy.deepcopy(next(q for q in FIXTURE["items"] if build.has_cost(q)))
    unit = FIXTURE["unit"]
    v = build.item_version(p, unit)
    assert build.item_version(dict(p, cost=p["cost"] + 10), unit) != v  # a new cost is a new decision
    assert build.item_version(p, dict(unit, many="weeks")) != v
    assert build.item_version(p, dict(unit, explain="Other words.")) == v  # wording of the unit is not
    q = next(x for x in FIXTURE["items"] if x.get("options"))
    flipped = dict(q, options=[{"text": o["text"], "id": o["id"]} for o in q["options"]])
    assert build.item_version(flipped, unit) == build.item_version(q, unit)  # key order is no change


def test_option_texts_must_differ():
    A = changed(items__0__options=[{"id": "a", "text": "Same"}, {"id": "b", "text": "same"}], items__0__proposal="a")
    A["items"][0].pop("cost")
    assert "text appears twice" in errors(A)
    A["items"][0]["options"][1]["text"] = "Later"
    assert "text appears twice" in errors(A)


def test_infinite_duration_is_an_error():
    folder = FIXTURE["car"]["folder"]
    tmpd = tmp()
    for f in (BASE / folder).iterdir():
        (tmpd / f.name).write_bytes(f.read_bytes())
    (tmpd / "done.json").write_text('[{"nr": 1, "duration": 1e309}]')
    assert "done.json" in errors(changed(car__folder=str(tmpd)))


def test_old_audio_for_a_changed_question_is_an_error():
    tmpd = tmp()
    for f in (BASE / FIXTURE["car"]["folder"]).iterdir():
        (tmpd / f.name).write_bytes(f.read_bytes())
    script = build.script(copy.deepcopy(FIXTURE))
    (tmpd / "tracks.json").write_text(json.dumps(script))
    for t in script["tracks"]:
        (tmpd / t["file"]).write_bytes(b"x")
    assert not errors(changed(car__folder=str(tmpd)))
    assert "older than the question" in errors(changed(car__folder=str(tmpd), items__0__about="A new question."))


def test_storage_key_keeps_fields_apart():
    assert build.storage_key("A|B", "C", "d") != build.storage_key("A", "B|C", "d")


def test_media_on_another_drive_becomes_a_file_url():
    real = build.os.path.relpath

    def other_drive(*_):
        raise ValueError("path is on mount 'D:', start on mount 'C:'")

    build.os.path.relpath = other_drive
    try:
        assert build.url(tmp(), BASE / "content.json").startswith("file:")
    finally:
        build.os.path.relpath = real


def test_budget_errors_show_with_other_errors():
    A = changed(items__0__counter=None, budget__max=100)
    assert "budget.max" in errors(A) and "counter: missing" in errors(A)


def test_numbers_are_spoken():
    A = copy.deepcopy(FIXTURE)
    A["items"][0]["proposalWhy"] = (
        "That saves 31 cards at 5,000 contacts, 1 click and 41 % open rate since March 3, 2026."
    )
    part = build.script(A)["tracks"][1]["parts"][2]["text"]
    for want in ("thirty-one cards", "five thousand contacts", "one click", "forty-one percent", "March 3, 2026"):
        assert want in part, part
    assert (
        build.num_word(15935) == "fifteen thousand nine hundred thirty-five"
        and build.num_word(101) == "one hundred one"
    )
    assert build.speak_numbers("version 1.5") == "version 1.5"


def test_one_item_and_one_unit():
    A = copy.deepcopy(FIXTURE)
    A["items"] = A["items"][:1]
    d = build.script(A)["tracks"]
    assert "There is one item" in d[0]["parts"][0]["text"]
    assert "That was the one item: Pinning." in d[-1]["parts"][0]["text"]
    assert "The estimated cost is one build night." in d[1]["parts"][0]["text"]


def test_answer_text_stays_unambiguous():
    assert "comma" in errors(changed(items__0__short="Layout, Type"))
    assert "line break" in errors(changed(items__0__short="Pinning\n2 Search: yes"))
    assert "line break" in errors(changed(title="List\n1 Pinning: yes"))


def test_pronounce_in_one_pass():
    A = changed(car__pronounce={"v2": "version two", "v": "vee"})
    assert "version two names" in json.dumps(build.script(A))
    assert "pronounce" in errors(changed(car__pronounce={"": "x"}))


def test_paper_choices_only_for_choice_questions():
    # Yes/no items sit under yes; otherwise the page contradicts its own rule after taking an edition.
    A = copy.deepcopy(FIXTURE)
    A["paper"]["editions"][0]["choices"] = {"archive": "no"}
    assert "choices only for choice questions" in errors(A)


def test_option_id_constructor_is_reserved():
    # The page looks answers up in plain JS objects; 'constructor' would hit their built-in function.
    A = changed(
        items__0__options=[{"id": "constructor", "text": "A"}, {"id": "b", "text": "B"}], items__0__proposal="b"
    )
    A["items"][0].pop("cost")
    assert "options[0]: id 'constructor' is reserved" in errors(A)


def test_option_id_of_wrong_type_does_not_crash():
    A = changed(items__0__options=[{"id": ["x"], "text": "A"}, {"id": "b", "text": "B"}], items__0__proposal="b")
    A["items"][0].pop("cost")
    assert "options[0]" in errors(A)


def test_short_names_must_differ():
    # The Order line names items by short; two equal shorts would make the order ambiguous.
    A = changed(items__1__short=FIXTURE["items"][0]["short"])
    assert "short appears twice" in errors(A)


def test_page_is_built_with_relative_urls():
    out = tmp() / "sub" / "page.html"
    assert build.main([str(BASE / "content.json"), "--out", str(out), "--way", "budget"]) == 0
    text = out.read_text(encoding="utf-8")
    assert "/*@CONTENT@*/" not in text and "<!--@SCRIPTS@-->" not in text
    data = json.loads(text.split('id="content">', 1)[1].split("</script>", 1)[0])
    assert data["start"] == "budget" and data["ways"] == ["paper", "budget", "panels", "car"]
    url = data["items"][0]["imageUrls"][0]
    assert not url.startswith("/") and (out.parent / url).resolve() == (BASE / "panels/pin1.png").resolve()
    assert len(data["car"]["pieces"]) == len(FIXTURE["items"]) + 2


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("ok", name)
    print("all tests green")
