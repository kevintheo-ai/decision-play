# Four Panels: how the picture stories are made

Each item that can be shown gets a story in four panels: 1 how it is today, 2 where it snags, 3 how it would be with
the change, 4 the real thing (screenshot, real excerpt, mockup). An image model paints panels 1 to 3. Panel 4 is never
painted. Any image model works; below is the recipe the example used.

## 1. Ask before spending

Before generating, tell the user the number of images, the model and the expected credits or cost. Generate only
after their OK. Report the credits actually used afterwards.

## 2. Picture world and reference sheets

- One picture world per list that fits the topic, where every thing has a fixed meaning (in the example: the café,
  the counter, the queue, the baker). The meanings go into `panels.legend` and are shown above the panels.
- Paint the reference sheets first and reuse them as references: the character (four times on one sheet: front,
  three-quarter, back, head), the set without people, the recurring objects. Faces, clothes and place then stay the
  same in every panel.
- No face or brand of a real person. The character is made up.

## 3. The image call (recipe of the example)

Higgsfield `generate_image_batch` (or `generate_image`), per image:

- `model`: `nano_banana_2_1`, `resolution`: `2k`, `aspect_ratio`: `4:3`, `thinking_level`: `high`
- `medias`: the reference sheets with `role: image_references`; from panel 2 on also panel 1 of the same item, so the
  camera angle and place stay the same
- Prompt in English, following this pattern:
  - "Image 1 is the baker: keep the baker's face, clothes and proportions exactly. Image 2 is the café: keep its ...
    Image 4 is the first moment of this story: keep the camera angle and the way the place looks."
  - then the scene: time of day, who stands where, what the character does and feels, "Wide eye-level shot, empty
    pale sky in the upper third." (or an empty wall, for interiors)
  - the same style sentence word for word in every image, for example: "Gouache and ink on cold-press paper,
    dry-brush grain, wobbly hand-inked outlines, muted warm palette, soft even daylight, matte."
  - end with, word for word: "No writing, letters, numbers, signs, logos, frames or borders anywhere." Text goes
    below the image, never inside it: image models misspell words.

## 4. Panel 4: the real thing

- If the thing exists (app, page, document): a screenshot of just the part that matters, at device scale factor 2.
  If it does not exist yet: a small HTML mockup, then a screenshot of it.
- Path in the item's `realImage`. Without `realImage` the fourth caption appears as a sentence in the panel.

## 5. Store and register

- Folder for the images, names `<id>1.jpg`, `<id>2.jpg`, `<id>3.jpg` (png and webp work too). Save them as JPG at
  about 1200 px width, otherwise the page loads slowly.
- Per item `captions`: exactly 4 captions, one sentence each, telling what you see. Caption 4 says what the real
  thing shows.
- `"panels": {"folder": "<image folder>", "legend": "What means what in the picture world."}`
- Items without `captions` appear as text cards. That is right for items that cannot be shown.
- Look at every image before using it: does the story hold, is there no writing anywhere, does the character look
  the same. Repaint a failed image on its own.
