import { createFileRoute } from "@tanstack/react-router";
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
      "About Running Events Near Me — an independent UK race discovery site. How we source race listings, what we do (and don't) do, and how to update a listing.";

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
          <p className="mt-3 text-muted-foreground leading-relaxed">
            An independent race discovery site for runners in the UK. Find local
            5Ks, 10Ks, half marathons, marathons, trail and ultra races — and
            the bigger events too.
          </p>

          <section className="mt-10">
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
