import { createFileRoute } from "@tanstack/react-router";
import {
  AudienceLandingPage,
  buildAudienceHead,
  type AudiencePageConfig,
} from "@/components/site/AudienceLandingPage";

const CFG: AudiencePageConfig = {
  slug: "for-organisers",
  metaTitle: "For race organisers — Running Events Near Me",
  metaDescription:
    "Free listing for permitted and community races. Structured submission, governance visibility, and a direct link to your entry page.",
  h1: "List your race in front of runners searching for it",
  intro: (
    <>
      <p>
        Runners search for the race they want, not the platform selling it.
        When someone searches "trail marathon Peak District October," we want
        your race to be the answer. The standard listing is free — we link
        straight to your entry page or your own site, and show your race's
        governance (EA / SA / WA / NI / TRA permit) as a trust signal for
        runners filtering by permitted races. We're also building out
        partnership and featured-placement options for organisers who want
        extra reach.
      </p>
    </>
  ),
  valueBlocks: [
    {
      title: "Free standard listing",
      body: "Every race gets a fair, structured listing linking directly to your entry page or website — at no cost, permanently.",
    },
    {
      title: "Governance visible",
      body: "If your race is permitted (EA / SA / WA / NI / TRA), we tag it. Runners filter for permitted races; you get found.",
    },
    {
      title: "Structured submission",
      body: "The submission form captures name, date, distances, location, entry URL and governance in one go. No back-and-forth email chain.",
    },
  ],
  ctas: [
    { label: "List your race", to: "/list-your-event" },
  ],
  faqs: [
    {
      q: "How much does it cost to list my race?",
      a: "The standard listing is free, permanently. We're also developing optional partnership and featured-placement options for organisers who want extra visibility — get in touch if that's of interest.",
    },
    {
      q: "How long until my race appears?",
      a: "Submissions are reviewed manually, usually within a few days. Permitted races from EA / SA / WA / NI / TRA are picked up automatically via each body's public calendar.",
    },
    {
      q: "Can I edit my listing after it's published?",
      a: "Yes — email us or resubmit and we'll update the page. A self-serve organiser claim flow (like the club claim) is on the roadmap.",
    },
  ],
};

export const Route = createFileRoute("/for-organisers")({
  head: () => buildAudienceHead(CFG),
  component: () => <AudienceLandingPage cfg={CFG} />,
});
