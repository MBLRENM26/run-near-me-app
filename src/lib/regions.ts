export interface Region {
  slug: string;
  name: string;
}

export const REGIONS: Region[] = [
  { slug: "london", name: "London" },
  { slug: "south-east", name: "South East" },
  { slug: "south-west", name: "South West" },
  { slug: "east-of-england", name: "East of England" },
  { slug: "east-midlands", name: "East Midlands" },
  { slug: "west-midlands", name: "West Midlands" },
  { slug: "yorkshire", name: "Yorkshire" },
  { slug: "north-west", name: "North West" },
  { slug: "north-east", name: "North East" },
  { slug: "scotland", name: "Scotland" },
  { slug: "wales", name: "Wales" },
  { slug: "northern-ireland", name: "Northern Ireland" },
];

export function slugToRegion(slug: string): Region | undefined {
  return REGIONS.find((r) => r.slug === slug);
}
