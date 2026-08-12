import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronRight,
  LocateFixed,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { getExplorerEvents } from "@/lib/explorer.functions";
import {
  EXPLORER_DATE_MODES,
  EXPLORER_DISTANCE_VALUES,
  EXPLORER_GOVERNANCE_VALUES,
  EXPLORER_PROFILE_VALUES,
  EXPLORER_RADII,
  EXPLORER_SORT_VALUES,
  EXPLORER_TERRAIN_VALUES,
  displayValue,
  explorerReasonLabels,
  type ExplorerDateMode,
  type ExplorerDistance,
  type ExplorerEvent,
  type ExplorerGovernance,
  type ExplorerProfile,
  type ExplorerQuery,
  type ExplorerRadius,
  type ExplorerSort,
  type ExplorerTerrain,
} from "@/lib/explorer";
import {
  trackExplorerCompare,
  trackExplorerCriteria,
  trackExplorerEventOpen,
  trackExplorerInspect,
  trackExplorerOpened,
  trackExplorerResults,
  trackLocationSet,
} from "@/lib/analytics";
import { geocodeOutward, geocodePostcode, isUkOutwardCode, isUkPostcode } from "@/lib/postcode";
import { formatEventDate } from "@/lib/date";
import { cn } from "@/lib/utils";

type ExplorerRouteSearch = ExplorerQuery;

const DEFAULT_SEARCH: ExplorerRouteSearch = {
  q: "",
  radius: 25,
  distance: "all",
  terrain: "all",
  governance: "all",
  profile: "all",
  dateMode: "dated",
  sort: "date",
};

function stringChoice<T extends readonly string[]>(
  raw: unknown,
  choices: T,
  fallback: T[number],
): T[number] {
  return typeof raw === "string" && choices.includes(raw as T[number])
    ? (raw as T[number])
    : fallback;
}

function finiteNumber(raw: unknown): number | undefined {
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function validateExplorerSearch(raw: Record<string, unknown>): ExplorerRouteSearch {
  const lat = finiteNumber(raw.lat);
  const lng = finiteNumber(raw.lng);
  const radiusValue = Number(raw.radius);
  const radius = EXPLORER_RADII.includes(radiusValue as ExplorerRadius)
    ? (radiusValue as ExplorerRadius)
    : DEFAULT_SEARCH.radius;
  return {
    q: typeof raw.q === "string" ? raw.q.trim().slice(0, 80) : "",
    ...(lat != null && lng != null ? { lat, lng } : {}),
    ...(typeof raw.label === "string" && raw.label.trim()
      ? { label: raw.label.trim().slice(0, 80) }
      : {}),
    radius,
    distance: stringChoice(raw.distance, EXPLORER_DISTANCE_VALUES, "all"),
    terrain: stringChoice(raw.terrain, EXPLORER_TERRAIN_VALUES, "all"),
    governance: stringChoice(raw.governance, EXPLORER_GOVERNANCE_VALUES, "all"),
    profile: stringChoice(raw.profile, EXPLORER_PROFILE_VALUES, "all"),
    dateMode: stringChoice(raw.dateMode, EXPLORER_DATE_MODES, "dated"),
    sort: stringChoice(raw.sort, EXPLORER_SORT_VALUES, "date"),
  };
}

export const Route = createFileRoute("/explore")({
  validateSearch: validateExplorerSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getExplorerEvents({ data: deps }),
  head: () => ({
    meta: [
      { title: "Race Explorer preview — Running Events Near Me" },
      {
        name: "description",
        content: "A controlled preview for finding and comparing UK running events.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ExplorerPage,
});

function ExplorerPage() {
  const search = Route.useSearch();
  const result = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const [searchInput, setSearchInput] = useState(search.q || search.label || "");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(result.events[0]?.id ?? null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const openedRef = useRef(false);

  const selected =
    result.events.find((event) => event.id === selectedId) ?? result.events[0] ?? null;
  const compared = useMemo(
    () =>
      compareIds
        .map((id) => result.events.find((event) => event.id === id))
        .filter((event): event is ExplorerEvent => event != null),
    [compareIds, result.events],
  );

  useEffect(() => {
    setSearchInput(search.q || search.label || "");
  }, [search.q, search.label]);

  useEffect(() => {
    if (!selectedId || !result.events.some((event) => event.id === selectedId)) {
      setSelectedId(result.events[0]?.id ?? null);
    }
    setCompareIds((ids) => ids.filter((id) => result.events.some((event) => event.id === id)));
  }, [result.events, selectedId]);

  useEffect(() => {
    if (!openedRef.current) {
      openedRef.current = true;
      trackExplorerOpened({
        date_mode: search.dateMode,
        has_location: search.lat != null && search.lng != null,
        results_count: result.total,
      });
    }
    trackExplorerResults({
      results_count: result.total,
      capped: result.capped,
      date_mode: search.dateMode,
    });
  }, [result.capped, result.total, search.dateMode, search.lat, search.lng]);

  const updateSearch = (patch: Partial<ExplorerRouteSearch>) => {
    void navigate({
      search: (previous) => ({ ...previous, ...patch }),
      replace: true,
    });
  };

  const setCriterion = <K extends keyof ExplorerRouteSearch>(
    key: K,
    value: ExplorerRouteSearch[K],
  ) => {
    trackExplorerCriteria({ criteria: key, value: String(value ?? "") });
    updateSearch({ [key]: value } as Pick<ExplorerRouteSearch, K>);
  };

  const applyTextSearch = async (event: FormEvent) => {
    event.preventDefault();
    const value = searchInput.trim();
    setSearchError(null);
    if (!value) {
      updateSearch({ q: "", lat: undefined, lng: undefined, label: undefined, sort: "date" });
      return;
    }
    if (isUkPostcode(value) || isUkOutwardCode(value)) {
      setLocating(true);
      const location = isUkPostcode(value)
        ? await geocodePostcode(value)
        : await geocodeOutward(value);
      setLocating(false);
      if (!location) {
        setSearchError("We couldn't locate that postcode. Check it and try again.");
        return;
      }
      trackLocationSet("postcode");
      trackExplorerCriteria({ criteria: "location", value: location.postcode });
      updateSearch({
        q: "",
        lat: location.lat,
        lng: location.lng,
        label: location.postcode,
        sort: "distance",
      });
      return;
    }
    trackExplorerCriteria({ criteria: "query", value });
    updateSearch({
      q: value,
      lat: undefined,
      lng: undefined,
      label: undefined,
      sort: "date",
    });
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Location is not available in this browser.");
      return;
    }
    setSearchError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        trackLocationSet("device");
        trackExplorerCriteria({ criteria: "location", value: "device" });
        updateSearch({
          q: "",
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "your location",
          sort: "distance",
        });
      },
      () => {
        setLocating(false);
        setSearchError("Location permission was not available. Try a postcode instead.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const inspect = (event: ExplorerEvent, position: number) => {
    setSelectedId(event.id);
    setMobileDrawerOpen(true);
    trackExplorerInspect({ slug: event.slug, position });
  };

  const toggleCompare = (event: ExplorerEvent) => {
    const included = compareIds.includes(event.id);
    if (included) {
      const next = compareIds.filter((id) => id !== event.id);
      setCompareIds(next);
      trackExplorerCompare({
        action: "removed",
        slug: event.slug,
        selected_count: next.length,
      });
      return;
    }
    if (compareIds.length >= 3) return;
    const next = [...compareIds, event.id];
    setCompareIds(next);
    trackExplorerCompare({
      action: compareIds.length === 0 ? "started" : "added",
      slug: event.slug,
      selected_count: next.length,
    });
  };

  const activeFilterCount = [
    search.q,
    search.lat,
    search.distance !== "all",
    search.terrain !== "all",
    search.governance !== "all",
    search.profile !== "all",
    search.dateMode !== "dated",
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      <Header compactOnMobile />
      <main className="mx-auto max-w-[1500px] px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Controlled product preview
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Race Explorer</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Find a plausible race, understand why it matches, and compare the details RENM can
              support today.
            </p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
            Preview only · not indexed · existing event pages remain canonical
          </div>
        </div>

        <form
          onSubmit={applyTextSearch}
          className="rounded-2xl border bg-background p-3 shadow-sm sm:p-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Place, postcode or event</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Place, postcode or event name"
                maxLength={80}
                className="h-11 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <Button type="submit" disabled={locating} className="h-11 sm:px-6">
              {locating ? "Locating…" : "Explore races"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={useDeviceLocation}
              disabled={locating}
              className="h-11"
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              Use my location
            </Button>
          </div>
          {searchError && <p className="mt-2 text-sm text-destructive">{searchError}</p>}
          {(search.q || search.label) && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                {search.label ? `Near ${search.label}` : `Matching “${search.q}”`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  updateSearch({
                    q: "",
                    lat: undefined,
                    lng: undefined,
                    label: undefined,
                    sort: "date",
                  });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </form>

        <div className="mt-4 grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_340px]">
          <aside className="h-fit rounded-2xl border bg-background p-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </h2>
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <FilterSelect
              label="Event schedule"
              value={search.dateMode}
              options={EXPLORER_DATE_MODES}
              labels={{ dated: "Races with dates", recurring: "Weekly / undated recurring" }}
              onChange={(value) => setCriterion("dateMode", value as ExplorerDateMode)}
            />
            <FilterSelect
              label="Race distance"
              value={search.distance}
              options={EXPLORER_DISTANCE_VALUES}
              onChange={(value) => setCriterion("distance", value as ExplorerDistance)}
            />
            <FilterSelect
              label="Terrain"
              value={search.terrain}
              options={EXPLORER_TERRAIN_VALUES}
              onChange={(value) => setCriterion("terrain", value as ExplorerTerrain)}
            />
            <FilterSelect
              label="Governance"
              value={search.governance}
              options={EXPLORER_GOVERNANCE_VALUES}
              onChange={(value) => setCriterion("governance", value as ExplorerGovernance)}
            />
            <FilterSelect
              label="Race profile"
              value={search.profile}
              options={EXPLORER_PROFILE_VALUES}
              onChange={(value) => setCriterion("profile", value as ExplorerProfile)}
            />

            {search.lat != null && search.lng != null && (
              <fieldset className="mt-5 border-t pt-4">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Travel radius
                </legend>
                <div className="mt-2 grid grid-cols-3 gap-1">
                  {EXPLORER_RADII.map((radius) => (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setCriterion("radius", radius)}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs font-medium",
                        search.radius === radius
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary/50",
                      )}
                    >
                      {radius} mi
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
          </aside>

          <section className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {result.capped
                    ? Math.min(result.total, 100).toLocaleString() + "+"
                    : result.total.toLocaleString()}{" "}
                  plausible {result.total === 1 ? "match" : "matches"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.capped
                    ? "Showing the first 100. Narrow the criteria for a more useful comparison."
                    : search.dateMode === "recurring"
                      ? "Recurring events are separated from dated races."
                      : "Estimated dates are labelled rather than treated as confirmed."}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort
                <select
                  value={search.sort}
                  onChange={(event) => setCriterion("sort", event.target.value as ExplorerSort)}
                  className="h-9 rounded-md border bg-background px-2 text-sm text-foreground"
                >
                  <option value="date">Race date</option>
                  <option value="distance" disabled={search.lat == null}>
                    Travel distance
                  </option>
                </select>
              </label>
            </div>

            {result.events.length === 0 ? (
              <div className="rounded-2xl border border-dashed bg-background p-10 text-center">
                <p className="font-semibold">No races match these criteria</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Widen the radius, remove a filter or try another place.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {result.events.map((event, index) => (
                  <ExplorerResultCard
                    key={event.id}
                    event={event}
                    position={index + 1}
                    selected={selected?.id === event.id}
                    compared={compareIds.includes(event.id)}
                    compareDisabled={compareIds.length >= 3 && !compareIds.includes(event.id)}
                    onInspect={() => inspect(event, index + 1)}
                    onCompare={() => toggleCompare(event)}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="hidden h-fit lg:sticky lg:top-4 lg:block">
            {selected ? (
              <EventInspection event={selected} source="detail" />
            ) : (
              <div className="rounded-2xl border border-dashed bg-background p-6 text-sm text-muted-foreground">
                Select a result to inspect its supported details.
              </div>
            )}
          </aside>
        </div>

        {compared.length > 0 && (
          <ComparePanel
            events={compared}
            onRemove={(event) => toggleCompare(event)}
            onClear={() => {
              setCompareIds([]);
              trackExplorerCompare({ action: "cleared", selected_count: 0 });
            }}
          />
        )}
      </main>
      <Footer />

      <Drawer open={mobileDrawerOpen && selected != null} onOpenChange={setMobileDrawerOpen}>
        <DrawerContent className="max-h-[88vh] lg:hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Event details</DrawerTitle>
            <DrawerDescription>Supported race information</DrawerDescription>
          </DrawerHeader>
          {selected && (
            <div className="overflow-y-auto p-4 pt-2">
              <EventInspection event={selected} source="detail" compact />
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function FilterSelect<T extends readonly string[]>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: T;
  labels?: Partial<Record<T[number], string>>;
  onChange: (value: T[number]) => void;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T[number])}
        className="mt-1.5 h-10 w-full rounded-md border bg-background px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {(labels as Partial<Record<string, string>> | undefined)?.[option] ??
              (option === "all" ? "Any" : displayValue(option))}
          </option>
        ))}
      </select>
    </label>
  );
}

function ExplorerResultCard({
  event,
  position,
  selected,
  compared,
  compareDisabled,
  onInspect,
  onCompare,
}: {
  event: ExplorerEvent;
  position: number;
  selected: boolean;
  compared: boolean;
  compareDisabled: boolean;
  onInspect: () => void;
  onCompare: () => void;
}) {
  const date = event.isRecurring
    ? event.sortDate
      ? formatEventDate({
          date_raw: event.dateRaw,
          sort_date: event.sortDate,
          date_from: event.dateFrom,
          date_to: event.dateTo,
          date_is_estimated: event.dateIsEstimated,
        })
      : "Recurring schedule"
    : formatEventDate({
        date_raw: event.dateRaw,
        sort_date: event.sortDate,
        date_from: event.dateFrom,
        date_to: event.dateTo,
        date_is_estimated: event.dateIsEstimated,
      }) || "Date not confirmed";
  const reasons = explorerReasonLabels(event);
  const route = event.raceProfile === "parkrun" ? "/parkrun-events/$slug" : "/events/$slug";

  return (
    <article
      className={cn(
        "rounded-xl border bg-background p-4 transition",
        selected ? "border-primary shadow-sm" : "hover:border-primary/40",
      )}
    >
      <div className="flex gap-3">
        <button type="button" onClick={onInspect} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">#{position}</span>
            {event.dateIsEstimated && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                Date TBC
              </span>
            )}
            {event.isRecurring && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-900">
                Recurring
              </span>
            )}
          </div>
          <h2 className="mt-1 truncate text-base font-semibold sm:text-lg">{event.name}</h2>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 shrink-0" /> {date}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0" />
              {[event.town, event.county].filter(Boolean).join(", ") || "Location not confirmed"}
            </span>
          </div>
          {reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {reasons.map((reason, reasonIndex) => (
                <span
                  key={reason + "-" + reasonIndex}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </button>
        <div className="flex shrink-0 flex-col items-end justify-between gap-3">
          <label className={cn("flex items-center gap-2 text-xs", compareDisabled && "opacity-40")}>
            <Checkbox
              checked={compared}
              disabled={compareDisabled}
              onCheckedChange={onCompare}
              aria-label={`Compare ${event.name}`}
            />
            Compare
          </label>
          <Link
            to={route}
            params={{ slug: event.slug }}
            onClick={() => trackExplorerEventOpen({ slug: event.slug, source: "card" })}
            className="hidden items-center gap-1 text-xs font-medium text-primary hover:underline sm:flex"
          >
            Full page <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function EventInspection({
  event,
  source,
  compact = false,
}: {
  event: ExplorerEvent;
  source: "detail" | "compare";
  compact?: boolean;
}) {
  const route = event.raceProfile === "parkrun" ? "/parkrun-events/$slug" : "/events/$slug";
  const date = event.isRecurring
    ? event.sortDate
      ? formatEventDate({
          date_raw: event.dateRaw,
          sort_date: event.sortDate,
          date_from: event.dateFrom,
          date_to: event.dateTo,
          date_is_estimated: event.dateIsEstimated,
        })
      : "Recurring schedule"
    : formatEventDate({
        date_raw: event.dateRaw,
        sort_date: event.sortDate,
        date_from: event.dateFrom,
        date_to: event.dateTo,
        date_is_estimated: event.dateIsEstimated,
      }) || "Not confirmed";
  const rows = [
    ["Schedule", date],
    ["Place", [event.town, event.county, event.region].filter(Boolean).join(", ") || "Unknown"],
    [
      "Race distance",
      event.distances || event.distanceTags.map(displayValue).join(", ") || "Unknown",
    ],
    ["Terrain", event.terrainTags.map(displayValue).join(", ") || "Unknown"],
    [
      "Governance",
      event.governance && event.governance !== "unknown"
        ? displayValue(event.governance)
        : "Not confirmed",
    ],
    ["Race profile", event.raceProfile ? displayValue(event.raceProfile) : "Unknown"],
    ["Organiser type", event.organiserType ? displayValue(event.organiserType) : "Unknown"],
    [
      "Travel",
      event.distanceMiles != null
        ? `${event.distanceMiles.toFixed(1)} miles`
        : "Set a postcode to calculate",
    ],
  ];

  return (
    <section className={cn("rounded-2xl border bg-background", !compact && "shadow-sm")}>
      <div className="border-b p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Event record</p>
        <h2 className="mt-1 text-xl font-bold leading-tight">{event.name}</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Missing values remain explicit. This preview does not infer unsupported attributes.
        </p>
      </div>
      <dl className="divide-y px-5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[105px_1fr] gap-3 py-3 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="p-5 pt-4">
        <Link
          to={route}
          params={{ slug: event.slug }}
          onClick={() => trackExplorerEventOpen({ slug: event.slug, source })}
          className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open canonical event page
          <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function ComparePanel({
  events,
  onRemove,
  onClear,
}: {
  events: ExplorerEvent[];
  onRemove: (event: ExplorerEvent) => void;
  onClear: () => void;
}) {
  return (
    <section className="fixed inset-x-2 bottom-2 z-40 max-h-[55vh] overflow-auto rounded-2xl border bg-background/95 p-4 shadow-2xl backdrop-blur sm:inset-x-6 lg:left-[calc(50%-500px)] lg:right-[calc(50%-500px)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Compare races ({events.length}/3)</h2>
          <p className="text-xs text-muted-foreground">
            The same supported fields are shown for every race.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear
        </Button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div key={event.id} className="relative rounded-xl border p-3">
            <button
              type="button"
              onClick={() => onRemove(event)}
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label={`Remove ${event.name} from comparison`}
            >
              <X className="h-4 w-4" />
            </button>
            <p className="pr-7 font-semibold leading-tight">{event.name}</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>
                {event.dateIsEstimated ? "Date TBC" : (event.sortDate ?? "Recurring schedule")}
              </li>
              <li>{[event.town, event.county].filter(Boolean).join(", ") || "Location unknown"}</li>
              <li>{event.distances || "Distance unknown"}</li>
              <li>{event.terrainTags.map(displayValue).join(", ") || "Terrain unknown"}</li>
              <li>
                {event.distanceMiles != null
                  ? `${event.distanceMiles.toFixed(1)} miles away`
                  : "Travel not calculated"}
              </li>
            </ul>
            <Link
              to={event.raceProfile === "parkrun" ? "/parkrun-events/$slug" : "/events/$slug"}
              params={{ slug: event.slug }}
              onClick={() => trackExplorerEventOpen({ slug: event.slug, source: "compare" })}
              className="mt-3 inline-flex items-center text-xs font-medium text-primary hover:underline"
            >
              Open event <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
        {events.length < 2 && (
          <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            Select another race to compare practical differences.
          </div>
        )}
      </div>
    </section>
  );
}
