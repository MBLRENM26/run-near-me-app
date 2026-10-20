import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/contact")({
  head: () => {
    const canonical = `${SITE_URL}/contact`;
    const title = "Contact us — Running Events Near Me";
    const description = "Get in touch with Running Events Near Me about a race listing, a correction or new event information.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:pt-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Contact us</h1>
          <p className="mt-4 text-foreground leading-relaxed">
            Spotted a change, have news about a race, or want to update a listing? Drop us a line.
          </p>
          <p className="mt-6 text-lg">
            <a href="mailto:info@hithe19.com" className="font-semibold text-primary underline">info@hithe19.com</a>
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
