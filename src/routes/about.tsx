import { createFileRoute, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SITE_URL } from "@/lib/site";
import { SITE_FAQS } from "@/lib/site-faqs";

export const Route = createFileRoute("/about")({
  head: () => {
    const canonical = `${SITE_URL}/about`;
    const description =
      "Running Events Near Me is a free UK race directory — 5Ks to ultras, road to trail, parkrun to multi-terrain. Searchable by postcode, region and distance. No account. No sign-up.";

    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: SITE_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    };

    return {
      meta: [
        { title: "About — Running Events Near Me" },
        { name: "description", content: description },
        { property: "og:title", content: "About — Running Events Near Me" },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(faqLd),
        },
      ],
    };
  },
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:pt-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            About Running Events Near Me
          </h1>

          <section className="mt-10">
            <h2 className="text-xl font-semibold text-foreground">
              What this is
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Running Events Near Me is a free UK race directory. 5Ks to ultras,
              road to trail, parkrun to multi-terrain — searchable by postcode,
              region, and distance. No account. No sign-up. Just races.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">
              Why it exists
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Finding a race near you shouldn't take longer than running one.
              Race listings in the UK are scattered across governing body
              portals, club websites, and Facebook groups nobody checks. This is
              the place that pulls it all together.
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-xl font-semibold text-foreground">
              How the data works
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Events are sourced from England Athletics, Scottish Athletics,
              Welsh Athletics, Athletics NI, individual research and organiser
              submissions. Every listing links directly to the official
              organiser page (or booking page if no website), for entries,
              pricing, and the details that change. We don't publish prices.
              Things move. Check the source before you travel.
            </p>
          </section>

          <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-foreground">
              Got a race that isn't listed? Running a club?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Both are free. Both link back to you — not to us.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/list-your-event"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Submit an event
              </Link>
              <Link
                to="/running-clubs"
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Claim your club
              </Link>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="mt-3">
              {SITE_FAQS.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-base text-foreground text-left">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
