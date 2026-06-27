// County hub config. Each entry resolves a URL slug to a label and the
// set of DB county strings it should match (London + Greater London are
// merged; other counties have one DB name). Inclusion gate: ≥25 ACTIVE
// events with an organiser-owned link, snapshot 2026-06.

export type CountyConfig = {
  slug: string;
  label: string;
  /** Values that appear in events.county for this county. */
  dbNames: string[];
};

export const COUNTIES: CountyConfig[] = [
  { slug: "london", label: "London", dbNames: ["London", "Greater London"] },
  { slug: "derbyshire", label: "Derbyshire", dbNames: ["Derbyshire"] },
  { slug: "lancashire", label: "Lancashire", dbNames: ["Lancashire"] },
  { slug: "devon", label: "Devon", dbNames: ["Devon"] },
  { slug: "kent", label: "Kent", dbNames: ["Kent"] },
  { slug: "west-yorkshire", label: "West Yorkshire", dbNames: ["West Yorkshire"] },
  { slug: "north-yorkshire", label: "North Yorkshire", dbNames: ["North Yorkshire"] },
  { slug: "greater-manchester", label: "Greater Manchester", dbNames: ["Greater Manchester"] },
  { slug: "cumbria", label: "Cumbria", dbNames: ["Cumbria"] },
  { slug: "essex", label: "Essex", dbNames: ["Essex"] },
  { slug: "berkshire", label: "Berkshire", dbNames: ["Berkshire"] },
  { slug: "hampshire", label: "Hampshire", dbNames: ["Hampshire"] },
  { slug: "cheshire", label: "Cheshire", dbNames: ["Cheshire"] },
  { slug: "lincolnshire", label: "Lincolnshire", dbNames: ["Lincolnshire"] },
  { slug: "surrey", label: "Surrey", dbNames: ["Surrey"] },
  { slug: "staffordshire", label: "Staffordshire", dbNames: ["Staffordshire"] },
  { slug: "shropshire", label: "Shropshire", dbNames: ["Shropshire"] },
  { slug: "east-sussex", label: "East Sussex", dbNames: ["East Sussex"] },
  { slug: "aberdeenshire", label: "Aberdeenshire", dbNames: ["Aberdeenshire"] },
  { slug: "suffolk", label: "Suffolk", dbNames: ["Suffolk"] },
  { slug: "buckinghamshire", label: "Buckinghamshire", dbNames: ["Buckinghamshire"] },
  { slug: "south-yorkshire", label: "South Yorkshire", dbNames: ["South Yorkshire"] },
  { slug: "county-durham", label: "County Durham", dbNames: ["County Durham"] },
  { slug: "gloucestershire", label: "Gloucestershire", dbNames: ["Gloucestershire"] },
  { slug: "oxfordshire", label: "Oxfordshire", dbNames: ["Oxfordshire"] },
  { slug: "merseyside", label: "Merseyside", dbNames: ["Merseyside"] },
  { slug: "dorset", label: "Dorset", dbNames: ["Dorset"] },
  { slug: "tyne-and-wear", label: "Tyne and Wear", dbNames: ["Tyne and Wear"] },
  { slug: "northumberland", label: "Northumberland", dbNames: ["Northumberland"] },
  { slug: "worcestershire", label: "Worcestershire", dbNames: ["Worcestershire"] },
  { slug: "somerset", label: "Somerset", dbNames: ["Somerset"] },
];

export function countyBySlug(slug: string): CountyConfig | null {
  return COUNTIES.find((c) => c.slug === slug) ?? null;
}
