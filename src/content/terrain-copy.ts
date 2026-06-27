// Editorial copy for terrain hub pages. Replace the TODO placeholders
// below with finalised 150–250 word intros and 3–4 FAQ pairs supplied
// by the editor. Pure data — no JSX, no DB calls.

export type TerrainFaq = { q: string; a: string };

export type TerrainCopy = {
  intro: string; // 150–250 words
  faqs: TerrainFaq[];
};

export const ROAD_COPY: TerrainCopy = {
  intro:
    "TODO: 150–250 word editorial intro about road racing in the UK. Cover what counts as a road race, the typical distances (parkrun 5K to city marathons), the kinds of courses runners encounter (closed-road city events vs club-organised village circuits), and what makes a road race different from trail or multi-terrain. Mention the strong UK road-racing tradition — the spring marathon majors, the Great Run series, the Royal Parks half — and the regional 10Ks that fill every weekend. Close with a sentence on how runners use this page to find events near them.",
  faqs: [
    {
      q: "TODO: What counts as a road race in the UK?",
      a: "TODO: Answer (1–3 sentences).",
    },
    {
      q: "TODO: How much do road races cost to enter?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: Are road races chip-timed?",
      a: "TODO: Answer.",
    },
  ],
};

export const FELL_COPY: TerrainCopy = {
  intro:
    "TODO: 150–250 word editorial intro about fell running in the UK. Describe what fell racing is (open hill and moorland, often unmarked, frequently requires navigation), where it's strongest geographically (Lake District, Peak District, Yorkshire Dales, Welsh and Scottish hills), the Fell Runners Association calendar, mandatory kit conventions (waterproofs, hat, gloves, map, compass, whistle, food/water for longer events), race categories (A/B/C, Short/Medium/Long), and the culture (low-cost entry, no chip timing, post-race tea-and-cake). Note that fell is a distinct discipline from trail running — rougher, steeper, more weather-exposed.",
  faqs: [
    {
      q: "TODO: What's the difference between fell running and trail running?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: Do I need mandatory kit for a UK fell race?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: What are A, B and C category fell races?",
      a: "TODO: Answer.",
    },
  ],
};

export const MULTI_TERRAIN_COPY: TerrainCopy = {
  intro:
    "TODO: 150–250 word editorial intro about multi-terrain races in the UK. Explain the niche (mix of road, trail, grass, towpath, sometimes a short fell section), why organisers choose this format (variety, accessibility, lower cost to permit than full road closures), typical distances (5K, 10K, 10-mile, half marathon), shoe choice (light trail or hybrid usually wins), how multi-terrain events differ from pure trail (less technical, less climb) and from pure road (more underfoot variety, slower per mile). Mention the England Athletics multi-terrain race calendar and the strong club-organised tradition.",
  faqs: [
    {
      q: "TODO: What is a multi-terrain race?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: What shoes should I wear for multi-terrain?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: Are multi-terrain race times slower than road?",
      a: "TODO: Answer.",
    },
  ],
};

export const TRAIL_COPY: TerrainCopy = {
  intro:
    "TODO: 150–250 word editorial intro about trail running in the UK. Define trail (off-road, on paths/tracks/forest/coast, less rugged than fell), the UK trail scene (Trail Running Association, growing race calendar, popular routes like the SDW, Cotswold Way, West Highland Way), distances from 10K to multi-day, the kit/nutrition considerations, and what differentiates trail from fell (less navigation, marked courses, more runnable underfoot). Close with practical advice on starting out and where to find races.",
  faqs: [
    {
      q: "TODO: What's a trail race?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: Do I need trail shoes for a UK trail race?",
      a: "TODO: Answer.",
    },
    {
      q: "TODO: How is trail different from fell?",
      a: "TODO: Answer.",
    },
  ],
};
