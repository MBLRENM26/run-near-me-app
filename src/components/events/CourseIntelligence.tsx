import { useEffect, useRef } from "react";
import { ExternalLink, Mountain, Route } from "lucide-react";
import type { CourseProfile } from "@/lib/course-profile";
import { trackCourseModuleViewed, trackCourseSourceOpened } from "@/lib/analytics";

type CourseIntelligenceProps = {
  course: CourseProfile;
};

export function CourseIntelligence({ course }: CourseIntelligenceProps) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let tracked = false;
    const recordView = () => {
      if (tracked) return;
      tracked = true;
      trackCourseModuleViewed({
        slug: course.eventSlug,
        provider: "plotaroute",
      });
    };

    if (!("IntersectionObserver" in window)) {
      recordView();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          recordView();
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [course.eventSlug]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="course-intelligence-heading"
      className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-card"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Route className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="course-intelligence-heading" className="text-xl font-semibold text-foreground">
              Course and elevation
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {course.organiser} publish this official course for the North Downs Run. Explore the
              route and elevation profile below.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-xl bg-muted/50 px-3 py-3">
            <dt className="text-xs text-muted-foreground">Route distance</dt>
            <dd className="mt-1 font-semibold text-foreground">{course.distanceLabel}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-3">
            <dt className="text-xs text-muted-foreground">Total ascent</dt>
            <dd className="mt-1 font-semibold text-foreground">{course.ascentLabel}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-3">
            <dt className="text-xs text-muted-foreground">Terrain</dt>
            <dd className="mt-1 font-semibold text-foreground">{course.terrainLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="border-y border-border bg-muted/20">
        <iframe
          src={course.embedUrl}
          title={`${course.routeName} interactive map and elevation profile`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="block h-[430px] w-full sm:h-[500px]"
        />
      </div>

      <div className="flex flex-col gap-2 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Mountain className="h-4 w-4" aria-hidden="true" />
          Route measurements and interactive profile by Plotaroute
        </p>
        <a
          href={course.routeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackCourseSourceOpened({
              slug: course.eventSlug,
              provider: "plotaroute",
            })
          }
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          Open full course
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
