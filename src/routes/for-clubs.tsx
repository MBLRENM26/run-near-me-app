import { createFileRoute } from "@tanstack/react-router";
import {
  AudienceLandingPage,
  buildAudienceHead,
  type AudiencePageConfig,
} from "@/components/site/AudienceLandingPage";

const CFG: AudiencePageConfig = {
  slug: "for-clubs",
  metaTitle: "For running clubs — Running Events Near Me",
  metaDescription:
    "Free club listing, member-facing race feeds, and a claim process to keep your page accurate. Built to help runners find your club and your races.",
  h1: "Help local runners find your club and your races",
  intro: (
    <>
      <p>
        There are ~1,700 affiliated running clubs in the UK across England
        Athletics, Scottish Athletics, Welsh Athletics and Athletics NI. Most
        have a website that a new runner will never find on Google. This site
        indexes clubs by town, county and region so runners searching for
        "running clubs near [town]" land on your page — for free.
      </p>
      <p>
        If your club also organises races, those races link back to your club
        page, so a runner who enters your 10K can find out you have a
        Tuesday-night session too.
      </p>
    </>
  ),
  valueBlocks: [
    {
      title: "Free listing, no signup",
      body: "Every affiliated club in the UK has (or will have) a page. No paywall, no upsell.",
    },
    {
      title: "Claim your page",
      body: "If you're a committee member, claim your club page to update contact details, session times, and links. We verify claims manually.",
    },
    {
      title: "Race → club backlinks",
      body: "When we know a race is organised by your club, the event page links to your club page. Free traffic from runners actively searching for events.",
    },
  ],
  ctas: [
    { label: "Browse running clubs", to: "/running-clubs" },
    { label: "Submit a club or race", to: "/list-your-event", variant: "secondary" },
  ],
  faqs: [
    {
      q: "Is this affiliated with England Athletics / Scottish Athletics / etc.?",
      a: "No — we're independent. We use each body's public club and events data to build listings.",
    },
    {
      q: "How do I claim my club page?",
      a: 'Find your club, click "Claim this page," and complete the form. We\'ll verify with a committee member before granting edit access.',
    },
    {
      q: "My club isn't listed. Can you add it?",
      a: "Yes — use the submission form and we'll add it manually.",
    },
  ],
};

export const Route = createFileRoute("/for-clubs")({
  head: () => buildAudienceHead(CFG),
  component: () => <AudienceLandingPage cfg={CFG} />,
});
