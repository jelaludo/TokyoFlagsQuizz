# Tokyo Quizz — Project Plan

## Concept

A playful, modern web app that teaches users about Tokyo's 23 special wards through their civic symbols: **flags, seals, official trees, flowers, and birds**. Users learn through flashcard-style browsing and test themselves with a quiz mode.

## Data Source Strategy

### Primary: Wikipedia (via Firecrawl)
Each ward has a dedicated Wikipedia page with a structured infobox containing:
- **Flag** image (all 23 available as SVGs on Wikimedia Commons)
- **Seal/Emblem** image (most wards)
- **Tree** (official ward tree)
- **Flower** (official ward flower)
- **Bird** (some wards — not all designate one)
- **Japanese name** (kanji)
- **Population**, **Area**, **Notable districts**

### The 23 Wards (ku/区)
| # | English | Japanese | Wikipedia slug |
|---|---------|----------|---------------|
| 01 | Chiyoda | 千代田区 | Chiyoda,_Tokyo |
| 02 | Chūō | 中央区 | Chūō,_Tokyo |
| 03 | Minato | 港区 | Minato,_Tokyo |
| 04 | Shinjuku | 新宿区 | Shinjuku |
| 05 | Bunkyō | 文京区 | Bunkyō |
| 06 | Taitō | 台東区 | Taitō |
| 07 | Sumida | 墨田区 | Sumida,_Tokyo |
| 08 | Kōtō | 江東区 | Koto,_Tokyo |
| 09 | Shinagawa | 品川区 | Shinagawa |
| 10 | Meguro | 目黒区 | Meguro |
| 11 | Ōta | 大田区 | Ōta,_Tokyo |
| 12 | Setagaya | 世田谷区 | Setagaya |
| 13 | Shibuya | 渋谷区 | Shibuya |
| 14 | Nakano | 中野区 | Nakano,_Tokyo |
| 15 | Suginami | 杉並区 | Suginami |
| 16 | Toshima | 豊島区 | Toshima |
| 17 | Kita | 北区 | Kita,_Tokyo |
| 18 | Arakawa | 荒川区 | Arakawa,_Tokyo |
| 19 | Itabashi | 板橋区 | Itabashi |
| 20 | Nerima | 練馬区 | Nerima |
| 21 | Adachi | 足立区 | Adachi,_Tokyo |
| 22 | Katsushika | 葛飾区 | Katsushika |
| 23 | Edogawa | 江戸川区 | Edogawa,_Tokyo |

## Data Pipeline (Phase 1)

1. **Scrape** each ward's Wikipedia page using `firecrawl scrape`
2. **Extract** from infobox: flag URL, seal URL, tree, flower, bird (if present)
3. **Cross-reference** Japanese Wikipedia for missing data / bilingual names
4. **Download** flag & seal SVGs from Wikimedia Commons
5. **Structure** into `data/wards.json` — single source of truth

### Target schema (`wards.json`)
```json
{
  "id": "shibuya",
  "name_en": "Shibuya",
  "name_ja": "渋谷区",
  "reading": "しぶやく",
  "flag_img": "flags/shibuya.svg",
  "seal_img": "seals/shibuya.svg",
  "tree": { "name_en": "Zelkova", "name_ja": "ケヤキ", "species": "Zelkova serrata" },
  "flower": { "name_en": "Iris", "name_ja": "ハナショウブ", "species": "Iris ensata" },
  "bird": { "name_en": null, "name_ja": null },
  "population": 243883,
  "area_km2": 15.11,
  "notable_districts": ["Shibuya", "Harajuku", "Ebisu", "Daikanyama"],
  "fun_fact": "Home to the famous Shibuya Crossing and Hachikō statue."
}
```

## App Design (Phase 2)

### Tech Stack
- **Vite + React + TypeScript** (fast, modern, familiar)
- **Tailwind CSS** — playful yet clean Japanese-inspired design
- **No backend needed** — static JSON data, deploy to Vercel/Netlify

### Modes
1. **Explore** — Browse all 23 wards as cards. Tap to flip and reveal symbols. Filter by symbol type.
2. **Quiz** — Multiple choice and image-matching:
   - "Which ward does this flag belong to?"
   - "What is Meguro's official tree?"
   - "Match the flower to the ward"
   - Score tracking, streaks, difficulty levels
3. **Map** (stretch) — Interactive SVG map of Tokyo's 23 wards. Tap a ward to see its symbols.

### Design Inspiration
- Japanese aesthetic: clean whitespace, subtle textures, warm palette
- Playful animations on card flips and correct answers
- Bilingual labels (EN/JP toggle)
- Mobile-first, responsive

## Implementation Steps

### Step 1: Data collection (now)
- [ ] Scrape all 23 ward Wikipedia pages with Firecrawl
- [ ] Parse and extract symbol data into structured JSON
- [ ] Download flag/seal images
- [ ] Fill gaps from Japanese Wikipedia if needed

### Step 2: Project scaffold
- [ ] `npm create vite@latest` with React + TS template
- [ ] Install Tailwind, set up basic layout
- [ ] Import `wards.json` data

### Step 3: Explore mode
- [ ] Ward card grid
- [ ] Card detail view with all symbols
- [ ] Filter/search

### Step 4: Quiz mode
- [ ] Question generator (random ward + random symbol category)
- [ ] Multiple choice UI
- [ ] Score tracking
- [ ] Results screen

### Step 5: Polish & deploy
- [ ] Animations, transitions
- [ ] Mobile optimization
- [ ] Deploy to Vercel
