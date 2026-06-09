import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const canonical = `${SITE_URL}/privacy`;
    const description =
      "How Running Events Near Me collects and uses personal data submitted through our event listing and claim forms.";
    return {
      meta: [
        { title: "Privacy Policy — Running Events Near Me" },
        { name: "description", content: description },
        { property: "og:title", content: "Privacy Policy — Running Events Near Me" },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-4 pt-12 pb-16 sm:pt-16">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: June 2026</p>

          <div className="mt-8 space-y-6 text-foreground leading-relaxed">
            <p>
              Running Events Near Me ("we", "us", "our") is operated by{" "}
              <strong>Hithe19 Consulting Limited</strong>, 12 High Street, Greenhithe,
              Kent, DA9 9NN.
            </p>
            <p>
              This policy explains how we collect and use personal data in connection
              with runningeventsnearme.com.
            </p>

            <section>
              <h2 className="text-xl font-semibold text-foreground">What data we collect</h2>
              <p className="mt-3">We collect personal data when you:</p>
              <ul className="mt-2 list-disc pl-6 space-y-1">
                <li>
                  Submit an event via the "List your event" form (name, email address,
                  event details you provide)
                </li>
                <li>
                  Claim an event listing via the "Claim this listing" form (name, email
                  address, event details you provide)
                </li>
              </ul>
              <p className="mt-3">
                We do not use cookies for tracking or advertising. We do not sell
                personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">How we use your data</h2>
              <p className="mt-3">
                Data submitted via our forms is used solely to review and publish event
                listings on this website. We may contact you by email to verify your
                submission or follow up on your listing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Lawful basis for processing</h2>
              <p className="mt-3">
                We process the personal data you submit through our forms on the basis
                of <strong>legitimate interest</strong> — operating an accurate directory
                of running events — and, where you ask us to contact you about a
                submission or claim, on the basis of <strong>consent</strong>. You may
                withdraw consent at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Where your data is stored</h2>
              <p className="mt-3">
                Submitted data is stored securely with our website hosting and database
                providers, who act as data processors on our behalf under standard
                contractual safeguards. We do not share your personal data with any
                other third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Data retention</h2>
              <p className="mt-3">
                We retain submitted data for as long as your event listing is active on
                the site. You may request deletion at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Your rights</h2>
              <p className="mt-3">
                Under UK GDPR you have the right to access, correct, or delete your
                personal data. To exercise these rights, contact:{" "}
                <a
                  href="mailto:info@hithe19.com"
                  className="text-primary hover:underline"
                >
                  info@hithe19.com
                </a>
              </p>
              <p className="mt-3">
                If you are unhappy with how we have handled your data, you also have
                the right to lodge a complaint with the UK Information Commissioner's
                Office (ICO) at{" "}
                <a
                  href="https://ico.org.uk/make-a-complaint/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  ico.org.uk/make-a-complaint
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground">Contact</h2>
              <p className="mt-3">
                Hithe19 Consulting Limited
                <br />
                <a
                  href="mailto:info@hithe19.com"
                  className="text-primary hover:underline"
                >
                  info@hithe19.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
