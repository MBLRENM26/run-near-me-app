import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SITE_URL } from "@/lib/site";

export interface AudienceFAQ {
  q: string;
  a: string;
}

export interface AudienceValueBlock {
  title: string;
  body: string;
}

export interface AudienceCTA {
  label: string;
  to: string;
  variant?: "primary" | "secondary";
}

export interface AudiencePageConfig {
  slug: "for-runners" | "for-clubs" | "for-organisers";
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: ReactNode;
  valueBlocks: AudienceValueBlock[];
  ctas: AudienceCTA[];
  faqs: AudienceFAQ[];
}

export function AudienceLandingPage({ cfg }: { cfg: AudiencePageConfig }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:pt-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all events
          </Link>

          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {cfg.h1}
          </h1>

          <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
            {cfg.intro}
          </div>

          {cfg.ctas.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3">
              {cfg.ctas.map((cta) => {
                const isPrimary = (cta.variant ?? "primary") === "primary";
                return (
                  <Link
                    key={cta.to}
                    to={cta.to}
                    className={
                      isPrimary
                        ? "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        : "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                    }
                  >
                    {cta.label}
                  </Link>
                );
              })}
            </div>
          )}

          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">
              What you get
            </h2>
            <ul className="mt-4 space-y-4">
              {cfg.valueBlocks.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 mt-0.5 flex-none text-primary" />
                  <div>
                    <p className="font-medium text-foreground">{b.title}</p>
                    <p className="mt-1 text-muted-foreground leading-relaxed">
                      {b.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground">
              Frequently asked questions
            </h2>
            <Accordion type="single" collapsible className="mt-3">
              {cfg.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
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

export function buildAudienceHead(cfg: AudiencePageConfig) {
  const canonical = `${SITE_URL}/${cfg.slug}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cfg.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return {
    meta: [
      { title: cfg.metaTitle },
      { name: "description", content: cfg.metaDescription },
      { property: "og:title", content: cfg.metaTitle },
      { property: "og:description", content: cfg.metaDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonical },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
    ],
  };
}
