import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEvents } from "../services/eventService";

const EVENT_LIMIT = 24;
const EVENT_TYPE_OPTIONS = ["All", "Live now", "Seminar", "Webinar", "Job fair", "Corporate Initiatives"];

const formatSchedule = (schedule) => {
  if (!schedule?.start) {
    return {
      dateLabel: "TBA",
      timeLabel: "",
    };
  }

  const date = new Date(schedule.start);
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    dateLabel: dateFormatter.format(date),
    timeLabel: timeFormatter.format(date),
  };
};

const isEventLive = (event) => {
  const startValue = event?.schedule?.start || null;
  if (!startValue) return false;
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return false;

  const now = Date.now();
  const startMs = start.getTime();
  const windowAfterMs = 30 * 60 * 1000;
  return now >= startMs && now <= startMs + windowAfterMs;
};

const EventsFilterChips = ({ categories, active, onSelect }) => (
  <div className='events-chips d-flex flex-wrap gap-12 justify-content-lg-end'>
    {categories.map((cat) => (
      <button
        key={cat}
        type='button'
        className={`filter-chip ${active === cat ? "is-active" : ""}`}
        onClick={() => onSelect(cat)}
      >
        {cat}
      </button>
    ))}
  </div>
);

const MasterclassCard = ({ event }) => {
  const { dateLabel, timeLabel } = formatSchedule(event?.schedule);
  const rawLabel = event?.price?.label || "";
  const isFreeLabel = rawLabel.trim().toLowerCase() === "free";
  const priceLabel =
    event?.price?.amount || (rawLabel && !isFreeLabel)
      ? rawLabel || `Rs ${event.price.amount}`
      : null;

  const liveNow = isEventLive(event);

  return (
    <article className='masterclass-card h-100'>
      <Link
        to={event?.slug ? `/events/${event.slug}` : "#"}
        className='masterclass-card__thumb'
        aria-label={event?.title || "View masterclass"}
      >
        <img
          src={event?.heroImage?.url || "/assets/images/thumbs/event-img1.png"}
          alt={event?.heroImage?.alt || event?.title || "Event thumbnail"}
          loading='lazy'
        />
        {liveNow ? (
          <span
            className='masterclass-card__badge'
            style={{ background: "#d6293e", color: "#fff" }}
          >
            Live now
          </span>
        ) : null}
        {!liveNow && event?.badge ? <span className='masterclass-card__badge'>{event.badge}</span> : null}
      </Link>
      <div className='masterclass-card__body'>
        <div className='masterclass-card__head flex-between gap-8'>
          <span className='masterclass-card__category'>{event?.eventType || "Event"}</span>
          {priceLabel ? (
            <span className={`masterclass-card__price-tag ${event?.price?.isFree ? "is-free" : ""}`}>
              {priceLabel}
            </span>
          ) : null}
        </div>
        <h3 className='masterclass-card__title text-line-2'>
          <Link to={event?.slug ? `/events/${event.slug}` : "#"} className='link'>
            {event?.title || "Untitled session"}
          </Link>
        </h3>
        <p className='masterclass-card__instructor mb-2'>
          {event?.host?.name || "Gradus Mentor"}
          {event?.host?.title ? ` | ${event.host.title}` : ""}
        </p>
        <p className='masterclass-card__summary text-line-2'>
          {event?.summary || event?.subtitle || "Join us live for an actionable masterclass."}
        </p>
        <p className='masterclass-card__time text-sm text-neutral-500 mb-0'>
          {dateLabel}
          {timeLabel ? ` | ${timeLabel}` : ""}
        </p>
      </div>
    </article>
  );
};

const LoadingState = () => (
  <div className='row g-4'>
    {Array.from({ length: 6 }).map((_, index) => (
      <div className='col-xl-4 col-md-6' key={`events-skel-${index}`}>
        <div className='masterclass-card skeleton animate-pulse'>
          <div className='skeleton-thumb rounded-24 mb-16' />
          <div className='skeleton-line w-75 mb-8' />
          <div className='skeleton-line w-50 mb-12' />
          <div className='skeleton-line w-100 mb-6' />
          <div className='skeleton-line w-60' />
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({
  title = "Nothing scheduled yet",
  description = "We’re curating the next wave of events. Check back shortly or subscribe to updates.",
}) => (
  <div className='empty-state text-center py-80'>
    <div className='empty-state__illustration mb-24'>
      <i className='ph ph-calendar-x text-3xl text-main-600' />
    </div>
    <h4 className='mb-8'>{title}</h4>
    <p className='text-neutral-600 mb-0'>{description}</p>
  </div>
);

const EventsAllOne = () => {
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const isLiveFilter = eventType === "Live now";
        const response = await fetchEvents({
          limit: EVENT_LIMIT,
          timeframe: isLiveFilter ? "all" : "upcoming",
          eventType: eventType === "All" || isLiveFilter ? undefined : eventType,
          signal: controller.signal,
        });
        if (!isMounted) return;
        setEvents(response?.items || []);
      } catch (err) {
        if (!isMounted || err?.name === "AbortError") return;
        setError(err?.message || "Failed to fetch events");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventType]);

  const visibleEvents = useMemo(() => {
    if (eventType === "Live now") {
      return events.filter(isEventLive);
    }
    return events;
  }, [events, eventType]);

  const liveBannerEvent = eventType === "Live now" && visibleEvents.length ? visibleEvents[0] : null;
  const showSpotlight = eventType !== "Live now" && visibleEvents.length > 2;
  const featuredEvent = showSpotlight ? visibleEvents[0] : null;
  const gridEvents = showSpotlight ? visibleEvents.slice(1) : visibleEvents;

  return (
    <section className='events-list py-20 bg-white'>
      <div className='container container--xl'>
        <header className='events-list__header d-flex flex-wrap gap-20 justify-content-lg-end mb-20'>
          <EventsFilterChips
            categories={EVENT_TYPE_OPTIONS}
            active={eventType}
            onSelect={setEventType}
          />
        </header>

        {liveBannerEvent ? (
          <div className='alert alert-info d-flex flex-wrap align-items-center justify-content-between rounded-16 p-16 mb-20'>
            <div className='d-flex flex-column gap-4'>
              <span className='badge bg-danger text-white align-self-start'>Live now</span>
              <h5 className='mb-0'>{liveBannerEvent.title || "Live webinar"}</h5>
              <p className='mb-0 text-neutral-600'>
                Join this webinar happening now (available until 30 minutes after the start time).
              </p>
            </div>
            <Link
              to={`/events/${liveBannerEvent.slug || ""}`}
              className='btn btn-primary rounded-pill px-24'
            >
              Join now
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className='alert alert-danger rounded-16'>{error}</div>
        ) : loading ? (
          <LoadingState />
        ) : visibleEvents.length === 0 ? (
          <EmptyState
            title={eventType === "Live now" ? "No live webinars right now" : undefined}
            description={
              eventType === "Live now"
                ? "Live webinars show here from their start time until 30 minutes after. Please check back soon."
                : undefined
            }
          />
        ) : (
          <>
            {showSpotlight && featuredEvent ? (
              <section className='events-hero spotlight-card mb-48'>
                <div className='spotlight-card__content'>
                  <p className='text-neutral-200 text-sm fw-semibold mb-4'>Featured</p>
                  <h2 className='spotlight-card__title text-line-2'>
                    {featuredEvent.title || "Masterclass highlight"}
                  </h2>
                  <p className='text-neutral-100 mb-16 text-line-3'>
                    {featuredEvent.summary ||
                      featuredEvent.subtitle ||
                      "Join our flagship live cohort to experience Gradus events."}
                  </p>
                  <div className='d-flex flex-wrap gap-12 align-items-center mb-20'>
                    <span className='spotlight-chip'>
                      {formatSchedule(featuredEvent.schedule).dateLabel}
                    </span>
                    <span className='spotlight-chip'>
                      {formatSchedule(featuredEvent.schedule).timeLabel || "TBA"}
                    </span>
                    <span className='spotlight-chip text-uppercase'>
                      {featuredEvent.category || "Masterclass"}
                    </span>
                  </div>
                  <Link
                    to={`/events/${featuredEvent.slug || ""}`}
                    className='btn btn-white rounded-pill px-32'
                  >
                    Join this session
                  </Link>
                </div>
                <div className='spotlight-card__media'>
                  <img
                    src={featuredEvent.heroImage?.url || "/assets/images/thumbs/event-img1.png"}
                    alt={featuredEvent.heroImage?.alt || featuredEvent.title || "Featured masterclass"}
                  />
                </div>
              </section>
            ) : null}

            {gridEvents.length ? (
              <div className='events-grid'>
                {gridEvents.map((event) => (
                  <MasterclassCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className='text-center py-40 text-neutral-500 fw-semibold'>
                More events are being scheduled. Stay tuned!
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default EventsAllOne;
