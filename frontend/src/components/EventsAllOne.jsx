import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEvents } from "../services/eventService";

const EVENT_LIMIT = 24;
const PAST_EVENT_LIMIT = 12;
const EVENT_TYPE_OPTIONS = ["All", "Live now", "Seminar", "Webinar", "Job fair", "Corporate Initiatives"];

const formatSchedule = (schedule) => {
  if (!schedule?.start) {
    return {
      dateLabel: "TBA",
      timeLabel: "",
      dayLabel: "Any",
      monthLabel: "",
      dayOfMonth: "",
      year: "",
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
    hour12: true,
  });
  const dayNameFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });
  const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

  const dateLabel = dateFormatter.format(date);
  const [dayOfMonth, monthLabel, year] = dateLabel.split(" ");

  return {
    dateLabel,
    timeLabel: timeFormatter.format(date),
    dayLabel: dayNameFormatter.format(date),
    monthLabel: monthLabel || monthFormatter.format(date),
    dayOfMonth,
    year,
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

const defaultTakeaways = [
  "Career opportunities",
  "High-demand skills for 2025",
  "How to grow your career fast",
  "Placement roadmap",
];

const EventTypeChips = ({ options, active, onSelect }) => (
  <div className='events-modern__chips'>
    {options.map((opt) => (
      <button
        key={opt}
        type='button'
        className={`event-chip ${active === opt ? "is-active" : ""}`}
        onClick={() => onSelect(opt)}
      >
        {opt}
      </button>
    ))}
  </div>
);

const EventCard = ({ event, isPast = false }) => {
  const { dateLabel, timeLabel, monthLabel, dayOfMonth, year } = formatSchedule(event?.schedule);
  const headline =
    event?.headline ||
    event?.subtitle ||
    "Companies are hiring... but only skilled candidates.";
  const desc =
    event?.summary ||
    "If you want a high-growth career, this is for you.";
  const takeaways = Array.isArray(event?.takeaways) && event.takeaways.length
    ? event.takeaways
    : defaultTakeaways;
  const eventType = event?.eventType || "Event";
  const hostName = event?.host?.name || "Gradus Mentor";
  const hostTitle = event?.host?.title ? ` | ${event.host.title}` : "";

  return (
    <article className='event-card'>
      <div className='event-card__hero'>
        <div className='event-card__copy'>
          <p className='event-card__eyebrow'>{headline}</p>
          <p className='event-card__desc'>{desc}</p>
          <div className='event-card__pill'>Join our webinar to learn:</div>
          <ul className='event-card__bullets'>
            {takeaways.map((item, idx) => (
              <li key={`${event.id}-takeaway-${idx}`}>{item}</li>
            ))}
          </ul>
          <div className='event-card__meta'>
            <div className='event-card__meta-row'>
              <span className='event-card__meta-icon' aria-hidden='true'>📅</span>
              <span className='event-card__meta-text'>{dateLabel}</span>
            </div>
            <div className='event-card__meta-row'>
              <span className='event-card__meta-icon' aria-hidden='true'>⏰</span>
              <span className='event-card__meta-text'>{timeLabel || "TBA"}</span>
            </div>
          </div>
          <Link
            to={event?.slug ? `/events/${event.slug}` : "#"}
            className='event-card__cta'
          >
            {isPast ? "View details" : "Register now"}
          </Link>
        </div>
        <div className='event-card__media'>
          <img
            src={event?.heroImage?.url || "/assets/images/thumbs/event-img1.png"}
            alt={event?.heroImage?.alt || event?.title || "Event speaker"}
            loading='lazy'
          />
          <p className='event-card__speaker'>
            {hostName}
            {hostTitle}
          </p>
        </div>
      </div>

      <div className='event-card__footer'>
        <div className='event-card__date'>
          <span className='event-card__date-month'>{monthLabel || "TBA"}</span>
          <span className='event-card__date-day'>{dayOfMonth || "--"}</span>
          <span className='event-card__date-year'>{year || ""}</span>
        </div>
        <div className='event-card__info'>
          <span className='event-card__type'>{eventType}</span>
          <h3 className='event-card__title'>
            <Link to={event?.slug ? `/events/${event.slug}` : "#"}>{event?.title || "Upcoming session"}</Link>
          </h3>
          <p className='event-card__host'>
            {hostName}
            {event?.host?.title ? ` | ${event.host.title}` : ""}
          </p>
        </div>
      </div>
    </article>
  );
};

const PastEventCard = ({ event }) => {
  const { dateLabel, monthLabel, dayOfMonth, year } = formatSchedule(event?.schedule);
  const eventType = event?.eventType || "Event";
  const hostName = event?.host?.name || "Gradus Mentor";
  const summary =
    event?.summary ||
    event?.subtitle ||
    "Replay the session highlights and key learnings.";

  return (
    <article className='past-event-card'>
      <div className='past-event-card__date'>
        <span className='past-event-card__month'>{monthLabel || "TBA"}</span>
        <span className='past-event-card__day'>{dayOfMonth || "--"}</span>
        <span className='past-event-card__year'>{year || ""}</span>
      </div>
      <div className='past-event-card__body'>
        <div className='past-event-card__pill'>{eventType}</div>
        <h3 className='past-event-card__title'>
          <Link to={event?.slug ? `/events/${event.slug}` : "#"}>{event?.title || "Past event"}</Link>
        </h3>
        <p className='past-event-card__meta'>
          {hostName} • {dateLabel || "Earlier"}
        </p>
        <p className='past-event-card__summary'>{summary}</p>
        <Link className='past-event-card__cta' to={event?.slug ? `/events/${event.slug}` : "#"}>
          View details
        </Link>
      </div>
    </article>
  );
};

const EventsAllOne = () => {
  const [eventType, setEventType] = useState(EVENT_TYPE_OPTIONS[0]);
  const [events, setEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
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
        const eventTypeFilter = eventType === "All" || isLiveFilter ? undefined : eventType;
        const [upcomingResponse, pastResponse] = await Promise.all([
          fetchEvents({
            limit: EVENT_LIMIT,
            timeframe: "upcoming",
            eventType: eventTypeFilter,
            signal: controller.signal,
          }),
          fetchEvents({
            limit: PAST_EVENT_LIMIT,
            timeframe: "past",
            eventType: eventTypeFilter,
            signal: controller.signal,
          }),
        ]);
        if (!isMounted) return;
        setEvents(upcomingResponse?.items || []);
        setPastEvents(pastResponse?.items || []);
      } catch (err) {
        if (!isMounted || err?.name === "AbortError") return;
        setError(err?.message || "Failed to fetch events");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [eventType]);

  const filterByType = (list) => {
    if (eventType === "All" || eventType === "Live now") return list;
    return list.filter(
      (ev) => (ev?.eventType || "").toLowerCase() === eventType.toLowerCase()
    );
  };

  const visibleUpcomingEvents = useMemo(() => {
    const filtered = filterByType(events);
    if (eventType === "Live now") {
      return filtered.filter(isEventLive);
    }
    return filtered;
  }, [events, eventType]);

  const visiblePastEvents = useMemo(
    () => filterByType(pastEvents),
    [pastEvents, eventType]
  );

  return (
    <section className='events-modern'>
      <div className='container container--xl events-modern__inner'>
        <header className='events-modern__head'>
          <div className='events-modern__title-block'>
            <p className='events-modern__eyebrow'>Events &amp; webinars</p>
            <h1 className='events-modern__title'>Events</h1>
            <p className='events-modern__subtitle'>
              Join the next live session or catch up on what you missed.
            </p>
          </div>
          <EventTypeChips
            options={EVENT_TYPE_OPTIONS}
            active={eventType}
            onSelect={setEventType}
          />
        </header>

        {error ? (
          <div className='alert alert-danger rounded-16'>{error}</div>
        ) : loading ? (
          <div className='events-modern__grid'>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`event-skeleton-${idx}`} className='event-card event-card--skeleton'>
                <div className='event-card__hero'>
                  <div className='event-card__copy'>
                    <div className='skeleton-line w-75 mb-12' />
                    <div className='skeleton-line w-60 mb-10' />
                    <div className='skeleton-line w-50 mb-16' />
                    <div className='skeleton-pill' />
                    <div className='skeleton-line w-80 mb-8' />
                    <div className='skeleton-line w-70 mb-8' />
                  </div>
                  <div className='event-card__media skeleton-box' />
                </div>
                <div className='event-card__footer'>
                  <div className='skeleton-line w-25 mb-8' />
                  <div className='skeleton-line w-60 mb-6' />
                  <div className='skeleton-line w-40' />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className='events-modern__section'>
              <div className='events-modern__section-head'>
                <h2 className='events-modern__section-title'>Upcoming events</h2>
                {eventType === "Live now" ? (
                  <span className='events-modern__section-note'>Showing sessions starting now</span>
                ) : null}
              </div>
              {visibleUpcomingEvents.length === 0 ? (
                <div className='text-center py-32 text-neutral-600 fw-semibold'>
                  More events are being scheduled. Check back soon.
                </div>
              ) : (
                <div className='events-modern__grid'>
                  {visibleUpcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>

            <div className='events-modern__section'>
              <div className='events-modern__section-head'>
                <h2 className='events-modern__section-title'>Past events</h2>
                <span className='events-modern__section-note'>
                  Recently concluded sessions you can explore.
                </span>
              </div>
              {visiblePastEvents.length === 0 ? (
                <div className='text-center py-24 text-neutral-600 fw-semibold'>
                  No past events match this filter yet.
                </div>
              ) : (
                <div className='events-modern__grid events-modern__grid--past'>
                  {visiblePastEvents.map((event) => (
                    <PastEventCard key={`past-${event.id}`} event={event} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default EventsAllOne;
