import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEvents } from "../services/eventService";

const EVENT_LIMIT = 24;
const EVENT_TYPE_OPTIONS = ["All", "Seminar", "Webinar", "Job fair", "Corporate Initiatives"];

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
        {event?.badge ? <span className='masterclass-card__badge'>{event.badge}</span> : null}
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

const EmptyState = () => (
  <div className='empty-state text-center py-80'>
    <div className='empty-state__illustration mb-24'>
      <i className='ph ph-calendar-x text-3xl text-main-600' />
    </div>
    <h4 className='mb-8'>Nothing scheduled yet</h4>
    <p className='text-neutral-600 mb-0'>
      We’re curating the next wave of events. Check back shortly or subscribe to updates.
    </p>
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
        const response = await fetchEvents({
          limit: EVENT_LIMIT,
          timeframe: "upcoming",
          eventType: eventType === "All" ? undefined : eventType,
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

  const showSpotlight = events.length > 2;
  const featuredEvent = showSpotlight ? events[0] : null;
  const gridEvents = showSpotlight ? events.slice(1) : events;

  return (
    <section className='events-list py-50 bg-white'>
      <div className='container container--xl'>
        <header className='events-list__header flex-between flex-wrap gap-20 mb-32'>
          <div>
            <h1 className='display-5 fw-semibold mb-8'>Events</h1>
          </div>
          <EventsFilterChips
            categories={EVENT_TYPE_OPTIONS}
            active={eventType}
            onSelect={setEventType}
          />
        </header>

        {error ? (
          <div className='alert alert-danger rounded-16'>{error}</div>
        ) : loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState />
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
