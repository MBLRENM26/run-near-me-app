// Editorial copy for terrain hub pages. Each hub imports its own copy
// constant and the TerrainHubPage renders the intro + FAQ accordion.

export type TerrainFaq = { q: string; a: string };

export type TerrainCopy = {
  intro: string; // 150–250 words
  faqs: TerrainFaq[];
};

export const ROAD_COPY: TerrainCopy = {
  intro:
    "Road racing is the backbone of UK running — from parkrun 5Ks to the London Marathon, more UK runners race on tarmac than on any other surface. The infrastructure that supports it is the most developed of any discipline. Road races offer something trail and fell events can't always match: certified distances, chip-timed results, and the clear benchmark of a personal best.\n" +
    "\n" +
    "England Athletics (EA) is the governing body for road running in England, with equivalent bodies in Scotland (Scottish Athletics), Wales (Welsh Athletics), and Northern Ireland (Athletics NI). EA-affiliated events are registered, insured, and produce results that feed into the national rankings system. Course accuracy is certified by the Association of UK Course Measurers (AUKCM). A certified course has been precisely measured by a licensed measurer and is accurate to within 0.1%. If running a PB matters, look for the AUKCM mark.\n" +
    "\n" +
    "The calendar has two distinct peaks: spring marathon season (March–May), anchored by London but extending to dozens of regional marathons you'll find listed here; and the autumn road racing season (September–November), when shorter distances — 5K, 10K, half marathon — dominate the calendar. Road races don't carry the logistics burden of remote terrain, aid stations, or mandatory kit requirements and are a great way to get into the sport.",
  faqs: [
    {
      q: "What does an 'England Athletics affiliated' race mean?",
      a: "EA-affiliated races are registered with England Athletics, which provides public liability insurance, ensures the event meets minimum safety standards, and feeds results into the national rankings system. Affiliated events can also offer a small entry discount to EA members. It's a mark of legitimacy though many excellent non-affiliated events also exist and operate to a high standard.",
    },
    {
      q: "How do I know if a course is accurately measured?",
      a: "Look for the AUKCM (Association of UK Course Measurers) certification on the event page. Certified courses have been physically measured by a licensed measurer using a calibrated wheel, accurate to within 0.1%. If you're chasing a PB, a certified course matters — an uncertified course might be marginally short or long, which affects whether the time stands as a genuine benchmark.",
    },
    {
      q: "What's the difference between chip time and gun time?",
      a: "Gun time is from the starting gun to when you cross the finish line. Your chip time runs from when you personally cross the start mat to when you finish, removing the queuing time in large events. For PB purposes, chip time is the meaningful number. Most results displays show both, and most PB claims use chip time.",
    },
    {
      q: "Are road races suitable for complete beginners?",
      a: "Yes absolutely — road races are the most accessible entry point into competitive running. Look for events at 5K distance here on runningeventsnearme.com and you're sure to find a fun, beginner-friendly race to join. The vast majority of road races at 5K and 10K are designed for a wide range of paces. Parkrun is an excellent free, timed first step if you just want to get out there at 9am on Saturday morning.",
    },
  ],
};

export const FELL_COPY: TerrainCopy = {
  intro:
    "Fell racing is Britain's most elemental form of running. No marked route, no hand-holding, just a start line, the weather, a set of checkpoints on a map, and the mountain between you. Governed by the Fell Runners Association (FRA), fell races take place on open hillside, moorland, and mountain, with competitors finding their own line between summits. Distances typically range from a sharp three-mile dash up a single summit to twenty-plus mile epics across multiple tops, but the defining measure is always ascent — hundreds, sometimes thousands, of metres of climb packed into comparatively short distances.\n" +
    "\n" +
    "The Lake District is the heartland — Wasdale Head, Borrowdale and the Langdale classics — with Ben Nevis in Scotland and the Three Peaks Race in Yorkshire rounding out the canon. Races are categorised by terrain difficulty and length (A through C; Short through Long), and the FRA publishes mandatory kit lists that vary by course — map, compass, and emergency shelter are standard for mountain races. Most events welcome unaffiliated runners, though some club races require FRA membership. The season runs year-round, with summer favouring high mountain routes and winter bringing the muddier classics closer to valley bases.",
  faqs: [
    {
      q: "Do I need to be a club member to enter a fell race?",
      a: "Most FRA-registered fell races are open to all, regardless of club membership. Some inter-club competitions and league races may require FRA club affiliation, but the majority of fell race calendars, including major classics, welcome unattached runners. Check the individual race entry page for any membership requirements.",
    },
    {
      q: "What mandatory kit is typically required?",
      a: "It depends on the race category. Short, low-level races may require nothing beyond running shoes. Mountain races (A category) typically mandate a full waterproof jacket, map, compass, whistle, emergency food, and first aid kit. Always download and read the race-specific kit list — marshals do check, and you can be disqualified for missing items.",
    },
    {
      q: "What's the difference between fell running and trail running?",
      a: "Fell racing has no marked route between checkpoints — navigation is part of the competition. Trail races follow waymarked courses where route-finding isn't required. Fell races also operate under strict FRA rules and typically involve more severe terrain and ascent relative to distance. Many runners do both; the skills needed are different.",
    },
    {
      q: "How are fell races categorised?",
      a: "The FRA grades races on two axes: terrain difficulty (A = hardest mountain terrain, B = intermediate, C = most accessible moorland) and length (L = Long, M = Medium, S = Short). An AL race is a long, serious mountain challenge; a CS race is a shorter, gentler introduction to the discipline. Common combinations include AL, AM, AS, BL, BM, BS, CL, CM, and CS. Checking the category before entering helps set realistic expectations.",
    },
  ],
};

export const MULTI_TERRAIN_COPY: TerrainCopy = {
  intro:
    "Multi-terrain races occupy the space between road and off-road. A typical multi-terrain event moves through parks, fields, canal towpaths, and stretches of pavement within the same course. This makes them more accessible than technical trail races while offering more variety and challenge than a straight road 10K.\n" +
    "\n" +
    "The discipline doesn't have a single governing body in the way road (EA) and fell (FRA) racing do, which means race formats vary more widely. Some multi-terrain events use road-style chip timing and certified courses; others are more informal and adventure-race adjacent. Most welcome unaffiliated runners with minimal kit requirements.\n" +
    "\n" +
    "Multi-terrain running is genuinely year-round, but it peaks in autumn and winter when conditions make road-only training feel limited. It's also where many road runners make their first move off-tarmac — the surface variety demands different muscle engagement and rewards a more adaptable running style. For club runners, multi-terrain events often count toward county or regional points leagues. For individuals, they offer a practical way to build trail and fell running fitness without committing to technical mountain races or strict mandatory kit lists.",
  faqs: [
    {
      q: "What's the difference between multi-terrain and cross country?",
      a: "Cross country (XC) traditionally refers to club and county league races held on cut grass, ploughed fields, and woodland, typically September to March, and often restricted to club members. Multi-terrain races are open events on mixed surfaces — road, trail, path, field — and run year-round. The atmosphere is similar: earthy, varied, often muddy. But multi-terrain events are generally more open to individual entry and don't require club affiliation.",
    },
    {
      q: "Do I need trail shoes for a multi-terrain race?",
      a: "Trail shoes are strongly recommended and, in wet conditions, effectively essential for safe grip. Road shoes manage dry multi-terrain courses but will struggle on any muddy or grassy sections, particularly on descents. If you only own road shoes and the forecast is wet, consider hiring or borrowing trail shoes for race day — the difference in grip and confidence on slippery ground is significant.",
    },
    {
      q: "Are multi-terrain races timed?",
      a: "Most use chip timing, particularly those affiliated with EA or county running leagues. Some smaller or more informal events use gun timing only. The event entry page will specify the timing system, which is worth checking if you're running for a specific time goal or need results for league points.",
    },
    {
      q: "What should I expect at my first multi-terrain race?",
      a: "More variation underfoot than a road race — be prepared to adjust your pace on technical or muddy sections rather than running even splits. Trail shoes, a light waterproof layer in autumn and winter, and slightly more conserved energy in the early miles are the standard first-timer adjustments. Finish times tend to run 5–15% slower than equivalent road distances, so recalibrate your expectations accordingly.",
    },
  ],
};

export const TRAIL_COPY: TerrainCopy = {
  intro:
    "Trail running is one of the UK's fastest-growing running disciplines — and the one with the widest possible spectrum. A 5K forest run and a 100-mile mountain ultra are both trail races. What they share: waymarked courses on off-road terrain, a direct connection to the outdoors, and a culture that tends to be more relaxed about finish times and more focused on the experience than road racing.\n" +
    "\n" +
    "In the UK, trail races are permitted and listed by the Trail Running Association (TRA), which sets standards for course accuracy, safety provision, and race organisation. TRA-permitted events carry insurance, have verified course information, and meet minimum safety requirements. That makes TRA permitting a useful filter when choosing an event. The terrain varies enormously: woodland single-track, bridleways, open moorland, coastal paths, and mountain routes all fall under the trail umbrella.\n" +
    "\n" +
    "The logistics of remote courses, aid stations, and safety teams adds real excitement and challenge. For longer distances (50K and above), mandatory kit lists are the norm: waterproof, map, emergency food, first aid. For shorter trail races, requirements are often minimal. The UK has a genuinely world-class trail race calendar, from the Lakes to Snowdonia to the South Downs — and thousands of smaller events that don't make the headlines but are excellent racing on every count. All found here on runningeventsnearme.com.",
  faqs: [
    {
      q: "What does 'TRA permitted' mean?",
      a: "A Trail Running Association permitted race has met TRA standards for course accuracy, safety provision, and event organisation. TRA-permitted events are covered by TRA insurance, have published course information verified against actual terrain, and meet requirements for aid stations and cut-off times. It's a useful quality marker when comparing events — though non-TRA events can still be well-organised and excellent.",
    },
    {
      q: "What's the difference between a trail race and a fell race?",
      a: "Trail races follow a marked, waymarked course — you don't need navigation skills, just follow the route. Fell races have no marked course; competitors navigate between checkpoints on open mountain or moorland. Fell racing is governed by the FRA with different kit rules and terrain conventions. Many runners do both, but the physical demands and skills required differ significantly.",
    },
    {
      q: "Do I need trail shoes?",
      a: "Not legally required, but strongly recommended for anything beyond easy dry-conditions terrain. Road shoes manage gentle, well-surfaced trails in dry weather but struggle on roots, rocks, and mud. Technical terrain, wet conditions, or any race with significant off-path sections is much safer and faster in proper trail shoes. When in doubt, check the race's recommended kit list.",
    },
    {
      q: "How do I know if a trail race is suitable for my level?",
      a: "Check three numbers: distance, total ascent (in metres), and cut-off time. Distance alone is misleading on trail — a 20K with 1,500m ascent is a hard day out; a 20K on flat bridleways is a solid run but not punishing. The TRA race listing includes ascent data where available. For your first trail race, start shorter than you think you need to, and give yourself more time than your road pace suggests.",
    },
  ],
};
