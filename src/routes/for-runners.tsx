import { createFileRoute } from "@tanstack/react-router";
import {
  AudienceLandingPage,
  buildAudienceHead,
  type AudiencePageConfig,
} from "@/components/site/AudienceLandingPage";

const CFG: AudiencePageConfig = {
  slug: "for-runners",
  metaTitle: "For runners — Running Events Near Me",
  metaDescription:
    "Find your next race with clear provenance, and distance, location and governance filters, plus a direct link to the organiser's own entry page.",
  h1: "Find your next race, and know exactly what you're entering",
  intro: (
    <>
      <p>
        Running looks like one tidy sport from the outside, but it's really a
        loose federation of overlapping worlds — England Athletics permitted
        club races, TRA-permitted trail ultras, Scottish and Welsh Athletics
        leagues, parkrun, big-city commercial marathons, and hundreds of small
        community events. We keep that structure visible instead of flattening
        every race into a single feed.
      </p>
      <p>
        Every event on this site carries its governance (who permits it),
        organiser type (club, commercial, community, charity), and race profile
        (road, trail, multi-terrain, track). Filter by any of them, and "Enter
        now" takes you straight to the organiser's own entry page or their
        permitted entry platform.
      </p>
    </>
  ),
  valueBlocks: [
    {
      title: "Clear provenance",
      body: "Every listing shows who governs the race and who's organising it. If it's an England Athletics permitted club race, we say so; if it's a commercial event, we say so.",
    },
    {
      title: "Filters that match how you actually think",
      body: "Distance, terrain, region, month — and now governance and organiser type. Find \"TRA-permitted trail ultras in Wales in September\" in three clicks.",
    },
    {
      title: "Straight to the organiser",
      body: "\"Enter now\" goes to the entry page the organiser chose; \"Visit organiser website\" goes to their own site.",
    },
  ],
  ctas: [
    { label: "Find a race", to: "/" },
    { label: "Browse by distance", to: "/10k-races", variant: "secondary" },
  ],
  faqs: [
    {
      q: "Do I have to pay to use this site?",
      a: "No. It's free to browse and free to enter races through the links.",
    },
    {
      q: 'Why do some events say "Visit organiser website" instead of "Enter now"?',
      a: "Because we only surface a direct entry link when the organiser publishes one on their own site or a permitted entry platform. If we can only find a homepage, we point you there.",
    },
    {
      q: "How up to date are the events?",
      a: "Governing-body permitted races are synced automatically. Community and club-organised races are added manually or via submissions; we prioritise the next 12 months.",
    },
  ],
};

export const Route = createFileRoute("/for-runners")({
  head: () => buildAudienceHead(CFG),
  component: () => <AudienceLandingPage cfg={CFG} />,
});
