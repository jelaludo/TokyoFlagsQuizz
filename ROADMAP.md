# Tokyo Quizz — Roadmap

## v2 Features

### 1. Full-screen, full visual experience
- Cards and quiz go edge-to-edge on mobile, immersive layout
- Population numbers displayed large and bold, not tucked away
- Area in km² given visual weight — make the data feel monumental

### 2. Kanji as design element
- Ward names in kanji displayed large (32px+), not as secondary labels
- Find a brush/calligraphy-inspired font (candidates: Shippori Mincho, Zen Antique, Kaisei Decol, Noto Serif JP)
- Kanji should feel like the primary identity, English as companion

### 3. Effortless bilingual throughout
- Tree, flower, bird names always shown EN + JP side by side
- Requires adding Japanese names to wards.json (scrape from ja.wikipedia.org)
- Large font bilingual — the text is short enough to go big
- District names in both scripts

### 4. Learning modes beyond quiz
- Flashcard mode with spaced repetition
- Match pairs (flag to ward, seal to ward)
- Drag-and-drop ranking (sort wards by population, area)
- Map mode — tap a ward on an SVG map to learn about it

### 5. Flags vs Seals distinction
- Visual explainer: what is a flag vs a seal/emblem
- Side-by-side comparison view per ward
- Different visual framing (flag on pole/rectangle, seal as stamp/circle)

### 6. Advanced quiz types
- "Pick the top 3 most populated wards from this list"
- "Rank these 4 wards by area, smallest to largest"
- "Which ward is this district in?" (e.g., Akihabara → Chiyoda)
- Timed challenge mode

## Data tasks for v2
- [ ] Scrape ja.wikipedia.org for Japanese tree/flower/bird names
- [ ] Add readings (hiragana) for all ward names
- [ ] Source a calligraphy web font
- [ ] Create SVG map of the 23 wards
