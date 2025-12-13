import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchEvents } from "../services/eventService";
import "../styles/events-card.css"; // Import new styles

const EVENT_LIMIT = 24;
const PAST_EVENT_LIMIT = 12;
const EVENT_TYPE_OPTIONS = ["All", "Upcoming", "Seminar", "Webinar", "Job fair", "Corporate Initiatives"];

const isEventLive = (event) => {
  const startValue = event?.schedule?.start || null;
  if (!startValue) return false;
  const start = new Date(startValue);
  if (Number.isNaN(start.getTime())) return false;

  const now = Date.now();
  const startMs = start.getTime();
  return now < startMs;
};

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

const MasterclassCard = ({ event, isPast = false }) => {
  const eventLink = event?.slug ? `/events/${event.slug}` : "#";
  const category = event?.eventType || event?.category || "General"; // Prioritize eventType (Seminar, Webinar, etc.)
  const title = event?.title || "Untitled Event";
  const hostName = event?.host?.name || "Gradus Mentor";
  const priceLabel = event?.price?.isFree ? "Free" : (event?.price?.amount ? `₹${event.price.amount}` : "Free");

  // Logic for button
  const buttonText = isPast ? "Registration Closed" : (event?.cta?.label || "Join Us Live");
  const isButtonDisabled = isPast;

  return (
    <article className="masterclass-card">
      {/* Header Image Section */}
      <div className="masterclass-card__header">
        <Link to={eventLink}>
          <img
            src={event?.heroImage?.url || "/assets/images/thumbs/event-img1.png"}
            alt={event?.heroImage?.alt || title}
            className="masterclass-card__img"
            loading="lazy"
          />
        </Link>
        <div className="masterclass-card__overlay" />

        {/* Optional Logo/Brand */}


        {/* Floating CTA Button */}
        <div className="masterclass-card__cta-overlay">
          {isButtonDisabled ? (
            <span className="masterclass-btn is-disabled">
              {buttonText}
            </span>
          ) : (
            <Link to={eventLink} className="masterclass-btn">
              {buttonText}
            </Link>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="masterclass-card__body">
        <span className="masterclass-card__tag">{category}</span>
        <h3 className="masterclass-card__title">
          <Link to={eventLink} style={{ color: 'inherit', textDecoration: 'none' }}>
            {title}
          </Link>
        </h3>

        <div className="masterclass-card__footer">
          <span className="masterclass-card__host">{hostName}</span>
          <span className="masterclass-card__price">{priceLabel}</span>
        </div>
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
        const isLiveFilter = eventType === "Upcoming";
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
    if (eventType === "All" || eventType === "Upcoming") return list;
    return list.filter(
      (ev) => (ev?.eventType || "").toLowerCase() === eventType.toLowerCase()
    );
  };

  const visibleUpcomingEvents = useMemo(() => {
    const filtered = filterByType(events);
    if (eventType === "Upcoming") {
      return filtered.filter(isEventLive);
    }
    return filtered;
  }, [events, eventType]);

  const visiblePastEvents = useMemo(
    () => filterByType(pastEvents),
    [pastEvents, eventType]
  );

  return (
    <section className='events-modern py-80'>
      <div className='container container--xl events-modern__inner'>
        <header className='events-modern__head mb-40'>
          <div className='events-modern__title-block'>
            <p className='events-modern__eyebrow'>Events &amp; webinars</p>
            <h1 className='events-modern__title'>Masterclasses</h1>
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
          // Simple Loading State
          <div className='text-center py-5'>Loading events...</div>
        ) : (
          <>
            {(visibleUpcomingEvents.length > 0 || eventType === "Upcoming") && (
              <div className='events-modern__section mb-60'>
                <div className='events-modern__section-head mb-24'>
                  <h2 className='events-modern__section-title'>Upcoming</h2>
                  {eventType === "Upcoming" ? (
                    <span className='events-modern__section-note ms-2'> - Showing sessions starting now</span>
                  ) : null}
                </div>
                {visibleUpcomingEvents.length === 0 ? (
                  <div className='text-center py-32 text-neutral-600 fw-semibold'>
                    No upcoming event is scheduled yet
                  </div>
                ) : (
                  <div className='masterclass-grid'>
                    {visibleUpcomingEvents.map((event) => (
                      <MasterclassCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {eventType !== "Upcoming" && (
              <div className='events-modern__section'>
                <div className='events-modern__section-head mb-24'>
                  <h2 className='events-modern__section-title'>Past events</h2>
                </div>
                {visiblePastEvents.length === 0 ? (
                  <div className='text-center py-24 text-neutral-600 fw-semibold'>
                    No past events match this filter yet.
                  </div>
                ) : (
                  <div className='masterclass-grid'>
                    {visiblePastEvents.map((event) => (
                      <MasterclassCard key={`past-${event.id}`} event={event} isPast={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default EventsAllOne;
