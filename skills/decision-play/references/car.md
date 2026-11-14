# In the Car: script and voice

## What the skill does

- `build.py <content.json> --script <tracks.json>` writes the script: intro, one piece per item, closing.
  Every item piece has three parts: explanation (voice `a`), objection (voice `b`), proposal with reasoning (voice `a`).
- The skill makes no audio. Without audio the In the Car way shows exactly this script on the page; the user can read
  and answer.
- If audio exists, put the folder in `car.folder` and the page plays it: next button skips, answer buttons per piece.

## Formats

`tracks.json` (what `--script` writes; every item piece also carries the `id` of its item and a `version` of the
question it was written for):

```json
{"title": "Spring list", "tracks": [
  {"nr": 1, "title": "Intro", "file": "01 Intro.mp3", "parts": [{"voice": "a", "text": "Hi. ..."}]},
  {"nr": 2, "id": "pickup", "version": "3f2a9c0b1d", "title": "Item 1: Pickup", "file": "02 Item 1 Pickup.mp3",
   "parts": [{"voice": "a", "text": "..."}, {"voice": "b", "text": "..."}, {"voice": "a", "text": "..."}]}
]}
```

To add audio, render each track with any text-to-speech you like (two different voices for `a` and `b`), save the
files under the names in `file` next to `tracks.json`, and write `done.json`: `[{"nr": 1, "duration": 28.4}, ...]`
(seconds). `--check` then verifies that every file exists, that every item has its track and that no track belongs to
an older version of its question. If the items changed, write the script again and render again.

## Writing for the ear

- `spoken`: the explanation as you would say it. No brackets, no abbreviations, short sentences. `build.py` turns all
  whole numbers into words in the spoken text ("31" becomes "thirty-one", "5,000" becomes "five thousand") and "%"
  into "percent". Exceptions stay digits: a day after a month name ("March 3"), anything from 1900 to 2100 without a
  comma (read as a year, so write "two thousand guests" yourself) and numbers from one million up. Without `spoken`, `build.py` assembles the explanation from `about`, `why`, the options and the cost.
  Number and name of the item ("Item one: Pickup.") and the proposal are added by `build.py`; leave them out of `spoken`.
- `objection`: one sentence for the second voice. It starts with "Against it:" for proposal yes, "For it:" for no, and
  "Against my proposal:" for later or an option. Without `objection`, `build.py` puts exactly this start in front of
  `counter`.
- A piece lasts about 30 seconds, roughly 60 to 80 words. Every piece must make sense on its own.
- `car.pronounce` replaces words only in the spoken text, for example `{"SKU": "skew"}`.
- Optional `car.note` replaces the line above the script when there is no audio; optional `car.voice` names the
  voice under the player when there is audio.

## Safety

While driving only listen, answer after parking. Silence counts as later, never as yes. The page says so in the box
"Safe on the road".
