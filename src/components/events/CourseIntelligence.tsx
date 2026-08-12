import { useEffect, useRef, useState } from "react";
import { ExternalLink, Mountain, Route } from "lucide-react";
import type { CourseProfile } from "@/lib/course-profile";
import {
  trackCourseDistanceSelected,
  trackCourseModuleViewed,
  trackCourseSourceOpened,
} from "@/lib/analytics";

type CourseIntelligenceProps = {
  course: CourseProfile;
};

export function CourseIntelligence({ course }: CourseIntelligenceProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [selectedRouteKey, setSelectedRouteKey] = useState(course.routes[0].key);
  const selectedRoute =
    course.routes.find((route) => route.key === selectedRouteKey) ?? course.routes[0];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let tracked = false;
    const recordView = () => {
      if (tracked) return;
      tracked = true;
      trackCourseModuleViewed({
        slug: course.eventSlug,
        provider: course.provider,
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
  }, [course.eventSlug, course.provider]);

  const selectRoute = (routeKey: string) => {
    setSelectedRouteKey(routeKey);
    trackCourseDistanceSelected({
      slug: course.eventSlug,
      provider: course.provider,
      distance: routeKey,
    });
  };

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
              {course.introduction}
            </p>
          </div>
        </div>

        {course.routes.length > 1 && (
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Choose race distance">
            {course.routes.map((route) => {
              const selected = route.key === selectedRoute.key;
              return (
                <button
                  key={route.key}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => selectRoute(route.key)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/50 hover:text-primary"
                  }`}
                >
                  {route.label}
                </button>
              );
            })}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="rounded-xl bg-muted/50 px-3 py-3">
            <dt className="text-xs text-muted-foreground">Route distance</dt>
            <dd className="mt-1 font-semibold text-foreground">{selectedRoute.distanceLabel}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-3">
            <dt className="text-xs text-muted-foreground">{course.elevationMetricLabel}</dt>
            <dd className="mt-1 font-semibold text-foreground">{selectedRoute.ascentLabel}</dd>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-3">
            <dt className="text-xs text-muted-foreground">Terrain</dt>
            <dd className="mt-1 font-semibold text-foreground">{course.terrainLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="border-y border-border bg-muted/20">
        <iframe
          key={selectedRoute.key}
          src={selectedRoute.embedUrl}
          title={`${selectedRoute.routeName} interactive map and elevation profile`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="block h-[430px] w-full sm:h-[500px]"
        />
      </div>

      <div className="flex flex-col gap-2 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Mountain className="h-4 w-4" aria-hidden="true" />
          Route measurements and interactive profile by {course.providerLabel}
        </p>
        <a
          href={selectedRoute.routeUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            trackCourseSourceOpened({
              slug: course.eventSlug,
              provider: course.provider,
              distance: selectedRoute.key,
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
