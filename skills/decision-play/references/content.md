# content.json: the fields

One file that every way reads from. `build.py --check` knows every field and reports typos, missing required fields
and structural errors. Paths are absolute or relative to `content.json`.
Full example with all ways: `../example/content.json` (a café team's spring decisions).

## Top level

| Field | Required | Content |
|---|---|---|
| `title` | yes | Short name of the list, shown at the top and in the answer text ("Spring list, my answers:") |
| `session` | yes | Name of this chat or session, as the user sees it. The user pastes the answers there. |
| `about` | yes | 1 to 3 sentences: what this is about and what the user should do. Shown above every way. |
| `date` | no | Date as text ("March 1, 2027"), otherwise today |
| `items` | yes | List of items, order = numbers |
| `unit` | if costs | `{"one": "build night", "many": "build nights", "explain": "A build night is about three hours of work with an agent."}` |
| `committed` | no | What comes anyway: `[{"name", "text", "cost"}]`, `cost` optional |
| `paper`, `budget`, `panels`, `car` | per way | one block per way, described below |

Keys starting with `_` are ignored (use them for comments).

## An item

| Field | Required | Content |
|---|---|---|
| `id` | yes | a-z, 0-9, hyphen (`pickup`). Images are named after it (`pickup1.jpg`). `constructor` is reserved. |
| `short` | yes | 1 to 3 words, for lists and the answer text. No comma, no line break; in the budget plan about 14 characters at most. |
| `title` | yes | One sentence as heading, no line break |
| `about` | yes | What changes, in everyday words |
| `proposal` | yes | `yes`, `no`, `later` or an option id |
| `proposalWhy` | yes | One or two sentences of reasoning |
| `counter` | yes | The strongest honest argument against your proposal. With proposal `yes` it speaks against the item, with `no` for it, with `later` or an option against that choice. The page labels it everywhere "Against my proposal". |
| `options` | no | A choice instead of yes/no: `[{"id": "deck", "text": "Deck oven"}, ...]`, 2 to 4. "Later" is added automatically. Option ids may not be `yes`, `no` or `later`. |
| `cost` | no | Effort as a whole number in the `unit`. Only on yes/no items. |
| `familiar` | no | The user's day today in one sentence ("On Saturdays the queue reaches the door ...") |
| `why` | no | What the item brings. Always speaks for the item (Budget: "For"). |
| `now`, `after` | no | State before and after |
| `evidence` | no | A number or observation with its source, only from this session |
| `costNote` | no | Where the cost comes from and what makes it uncertain |
| `risk`, `regret` | no | What can go wrong; what the user might regret in three months. Always speak against the item (Budget: "Against", Paper: letter to the editor). |
| `conflict` | no | What the user decided differently before, with date |
| `ifYes`, `ifNo` | no | What happens on yes and on no |
| `spoken`, `objection` | no | Spoken version for In the Car, see `car.md` |
| `captions`, `realImage` | no | 4 panel captions and the real fourth image, see `panels.md` |

Every field has a place: the overview shows all fields of an item when expanded, the ways take what they need. For
Budget and the letter to the editor in Paper, `why` and `risk` or `regret` matter most, because there the proposal is
deliberately not shown.

## Block `paper`

```json
"paper": {
  "prefix": "The", "name": "Crumb", "place": "Riverside", "date": "June 1, 2027",
  "intro": "What this is about and that the papers are made up, 2 to 4 sentences.",
  "editions": [
    {"id": "small", "name": "Quiet", "yes": ["a"], "headline": "Headline", "lede": "One sentence.",
     "story": "A working day in the future, 6 to 10 sentences.", "choices": {"b": "deck"},
     "image": "screenshot.png", "caption": "This is how it would look."}
  ],
  "nothing": {"name": "Nothing new", "headline": "...", "lede": "...", "story": "..."}
}
```

- 2 or 3 editions, best from small to large, each building on the previous one. Then the letter to the editor shows
  only what is new.
- `yes` lists the yes items of the edition. Choice items, and only they, go under `choices`. Everything else becomes
  "no" when taking the edition if the proposal was no, otherwise "later". Taking an edition clears an order set in
  Budget.
- The story tells one working day in that future. It invents no new numbers and nothing that is not in the item. The
  page marks every edition as made up.
- `image` is optional, ideally a screenshot of the real thing or a mockup. Without an image the story is wider.
- The paper's name fits the topic. Keep it short, it is set very large. Edition `id` may not be `nothing`.

## Block `budget`

```json
"unit": {"one": "build night", "many": "build nights", "explain": "A build night is about three hours of work."},
"budget": {"min": 3, "max": 15, "start": 6, "intro": "This is about the next round for X."}
```

- Only yes/no items with `cost` take part, at least 2. Choice items and items without cost appear as a note below.
- Set `start` tight, so not everything fits: the game lives from weighing. Without values `build.py` computes start
  values. Items larger than `max` appear as "fits no round". `max` is at most 30.
- The unit is free (hour, day, dollar), as long as `one` and `many` are right. Optional `title` overrides the heading.

## Blocks `panels` and `car`

See `panels.md` and `car.md` in this folder.

## Small example

```json
{
  "title": "Website round",
  "session": "Website",
  "about": "Three open items for the shop website. You say yes, no or later for each, then I build.",
  "unit": {"one": "build night", "many": "build nights"},
  "items": [
    {"id": "faq", "short": "FAQ page", "title": "A page with the common questions", "about": "...", "cost": 2,
     "proposal": "yes", "proposalWhy": "...", "counter": "..."},
    {"id": "language", "short": "Language", "title": "Which language first", "about": "...",
     "options": [{"id": "en", "text": "English"}, {"id": "es", "text": "Spanish"}],
     "proposal": "en", "proposalWhy": "...", "counter": "..."},
    {"id": "video", "short": "Video", "title": "Video on the home page", "about": "...", "cost": 1,
     "proposal": "later", "proposalWhy": "...", "counter": "..."}
  ],
  "budget": {"start": 2}
}
```
