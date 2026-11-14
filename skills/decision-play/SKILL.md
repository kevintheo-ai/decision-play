---
name: decision-play
description: "Turns the open questions and decisions of a session into a playful local page instead of a wall of text: Tomorrow's Paper, Build Budget, Four Panels or In the Car. The user answers on the page and pastes one text back into the chat. Triggers: as a newspaper, tomorrow's paper, as a budget game, build budget, as panels, as a comic, four pictures, in the car, to listen to, /decision-play."
user-invocable: true
---

# /decision-play: open questions in four forms

Some people decide faster when a decision feels like a game than when it arrives as a text block. Each session
writes its open items once as `content.json`; `scripts/build.py` checks it and builds one self-contained HTML page.
Answers follow the user from way to way on the page. At the end the user copies one text into this chat. Only that
text counts: clicks on the page are never approval.

Paths like `scripts/build.py` are relative to the folder of this SKILL.md. Python 3.10 or newer, standard library
only.

## The four ways

| The user says | Way (`--way`) | Needs in the content | Costs |
|---|---|---|---|
| "as a newspaper", "tomorrow's paper" | `paper` | block `paper` with 2 or 3 future editions | nothing |
| "as a budget game", "build budget", "with a budget" | `budget` | `unit`, block `budget`, `cost` on yes/no items with a known effort (at least 2; the rest is listed as a note) | nothing |
| "as panels", "as a comic", "four pictures" | `panels` | block `panels`, `captions` (4 per item) and 3 painted images for the items that can be shown (at least 1; the rest become text cards) | image credits, see `references/panels.md` |
| "in the car", "to listen to" | `car` | block `car`; `spoken` and `objection` only if the spoken text should differ from `about` and `counter` | the skill writes a script, no audio, see `references/car.md` |

Each block in the content is one way on the page. Start with the way the user named. Paper and Budget cost nothing
and may be added when the items support them. If the user only says "/decision-play": Paper, plus Budget when items
have an effort.

## Flow

1. **Collect the items.** Every open question and decision of this session becomes one item. Every factual statement
   needs a source from this session (a file you read, tool output, the user). Mark estimates "estimated" and
   uncertain things "not sure". Done when no open item of the session is missing and no sentence lacks a source.
2. **Create the folder.** Page and content go to `<project>/docs/<YYYY-MM-DD>_decision-play_<topic>/`
   (`content.json`, `index.html`). Images and audio may live in the same folder or next to it.
3. **Write the content.** Read `references/content.md` first (fields, what each way requires, small example; full
   example: `example/content.json`). Plain everyday words, address the user as "you", short sentences.
   `counter` is the strongest honest argument against your proposal, `why` the one for the item, `risk` the one
   against it. The page never puts your proposal in front: it would steer the choice.
   Add the `panels` block and `car.folder` only in step 5, once images and audio exist; the `captions` of the items
   belong in now.
4. **Check.** `python3 scripts/build.py <content.json> --check` until it prints `OK`. Read each `NOTE` and fix what
   is worth fixing.
5. **Material for the way.** Panels: `references/panels.md` (ask before spending any credits). In the Car:
   `references/car.md`. Then add the `panels` block or `car.folder` and repeat step 4: only then does `build.py` check
   every image and audio file.
6. **Build, look at it, open it.** `python3 scripts/build.py <content.json> --out <folder>/index.html --way <way>`,
   then look at the way in a browser at 1440 and 390 px width (screenshot, no script errors, nothing cut off).
   Only then open `<folder>/index.html` for the user.
7. **Tell the user**, briefly: "<n> decisions as <way>: <topic>", one sentence on what it is about, then "The page is
   open. At the bottom you copy your answers and paste them here."
8. **Read back, then record.** When the text arrives ("<title>, my answers: ..."), repeat in one sentence per item
   what you understood and wait for "correct". Only then record the decisions wherever this project records
   decisions. Keep the line "How the ways felt" with them: it shows which ways the user really uses.

## Answer text

The page builds one text, whatever way the user answered in:

```
<title>, my answers:
1 <short>: yes | no | later | <option text>
...
Still open: 3, 5
Order: <short>, <short>
How the ways felt: <way name> <rating>, ...
```

"Still open" lists unanswered item numbers. "Order" appears only for items answered yes and ordered in the budget
plan. Lines appear only when they have content.

## Limits

- The page stays a local file: write it into the project folder and open it. Do not upload it anywhere.
- The page only asks. Sending, posting and buying stay with the user, as everywhere.
- Clicks on the page are never approval. Only the text the user pastes into the chat counts.

## After changing the skill

`python3 tests/test_build.py` (check logic) and `python3 tests/smoke.py` (builds the example and clicks every way in
a browser). Both must pass.
