import PropTypes from "prop-types";
import { Icon } from "@iconify/react";

const numberFormatter = new Intl.NumberFormat("en-IN");

const defaultSummary = {
  uniqueVisitors: 0,
  totalVisits: 0,
  todayVisits: 0,
  weekVisits: 0,
  monthVisits: 0,
};

const defaultMonthlyBucket = {
  totalVisits: 0,
  uniqueVisitors: 0,
};

const defaultPageSummary = {
  totalVisits: 0,
  uniqueVisitors: 0,
};

const formatNumber = (value) => numberFormatter.format(value || 0);

const computeChange = (current, previous) => {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  const delta = currentValue - previousValue;

  return {
    delta: Math.abs(delta),
    direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down",
    percent: previousValue > 0 ? Math.abs((delta / previousValue) * 100) : null,
  };
};

const TrendBadge = ({ change, loading }) => {
  if (loading || !change) {
    return (
      <span className='d-inline-flex align-items-center gap-1 rounded-pill px-8 py-2 text-sm fw-semibold bg-neutral-100 text-secondary-light'>
        <Icon icon='line-md:loading-twotone-loop' className='text-xs' />
        Updating
      </span>
    );
  }

  const isFlat = change.direction === "flat";
  const isUp = change.direction === "up";
  const pillClass = isFlat
    ? "bg-neutral-100 text-secondary-light"
    : isUp
    ? "bg-success-focus text-success-main border br-success"
    : "bg-danger-focus text-danger-main border br-danger";
  const icon = isFlat ? "solar:minus-linear" : isUp ? "bxs:up-arrow" : "bxs:down-arrow";
  const sign = isFlat ? "" : isUp ? "+" : "-";

  return (
    <span className={`d-inline-flex align-items-center gap-1 rounded-pill px-8 py-2 text-sm fw-semibold ${pillClass}`}>
      <Icon icon={icon} className='text-xs' />
      {isFlat ? "0" : `${sign}${formatNumber(change.delta)}`}
      {change.percent !== null ? ` (${sign}${change.percent.toFixed(1)}%)` : ""}
    </span>
  );
};

TrendBadge.propTypes = {
  change: PropTypes.shape({
    delta: PropTypes.number,
    direction: PropTypes.string,
    percent: PropTypes.number,
  }),
  loading: PropTypes.bool,
};

const UnitCountOne = ({ analytics }) => {
  const summary = analytics?.summary || defaultSummary;
  const monthly = Array.isArray(analytics?.monthly) ? analytics.monthly : [];
  const pageViewsSummary = analytics?.pageViews?.summary || defaultPageSummary;
  const isLoading = Boolean(analytics?.loading);
  const error = analytics?.error || null;

  const latestMonth = monthly.length > 0 ? monthly[monthly.length - 1] : defaultMonthlyBucket;
  const previousMonth = monthly.length > 1 ? monthly[monthly.length - 2] : defaultMonthlyBucket;

  const uniqueChange = computeChange(latestMonth.uniqueVisitors, previousMonth.uniqueVisitors);
  const visitChange = computeChange(latestMonth.totalVisits, previousMonth.totalVisits);
  const averageWeek = summary.weekVisits ? summary.weekVisits / 7 : 0;
  const rangeLabel = analytics?.pageViews?.range || 30;

  const cards = [
    {
      key: "unique-visitors",
      title: "Unique visitors",
      value: summary.uniqueVisitors,
      icon: "gridicons:multiple-users",
      iconBg: "bg-cyan",
      cardBg: "bg-gradient-start-1",
      subtext: (
        <>
          <TrendBadge change={uniqueChange} loading={isLoading} />
          <span>This month: {isLoading ? "..." : formatNumber(latestMonth.uniqueVisitors)}</span>
        </>
      ),
    },
    {
      key: "total-visits",
      title: "Total visits",
      value: summary.totalVisits,
      icon: "fa-solid:award",
      iconBg: "bg-purple",
      cardBg: "bg-gradient-start-2",
      subtext: (
        <>
          <TrendBadge change={visitChange} loading={isLoading} />
          <span>This month: {isLoading ? "..." : formatNumber(latestMonth.totalVisits)}</span>
        </>
      ),
    },
    {
      key: "last-30-days",
      title: "Last 30 days",
      value: pageViewsSummary.totalVisits,
      icon: "fluent:people-20-filled",
      iconBg: "bg-info",
      cardBg: "bg-gradient-start-3",
      subtext: isLoading ? (
        <span>Loading analytics...</span>
      ) : (
        <span>
          Unique: {formatNumber(pageViewsSummary.uniqueVisitors)} over last {rangeLabel} days
        </span>
      ),
    },
    {
      key: "week-visits",
      title: "Last 7 days",
      value: summary.weekVisits,
      icon: "solar:wallet-bold",
      iconBg: "bg-success-main",
      cardBg: "bg-gradient-start-4",
      subtext: isLoading ? (
        <span>Loading analytics...</span>
      ) : (
        <span>Avg {formatNumber(averageWeek)} visits per day</span>
      ),
    },
    {
      key: "today-visits",
      title: "Today",
      value: summary.todayVisits,
      icon: "fa6-solid:file-invoice-dollar",
      iconBg: "bg-red",
      cardBg: "bg-gradient-start-5",
      subtext: isLoading ? <span>Loading analytics...</span> : <span>Since midnight (local time)</span>,
    },
  ];

  return (
    <>
      <div className='row row-cols-xxxl-5 row-cols-lg-3 row-cols-sm-2 row-cols-1 gy-4'>
        {cards.map((card) => (
          <div className='col' key={card.key}>
            <div className={`card shadow-none border ${card.cardBg} h-100`}>
              <div className='card-body p-20'>
                <div className='d-flex flex-wrap align-items-center justify-content-between gap-3'>
                  <div>
                    <p className='fw-medium text-primary-light mb-1'>{card.title}</p>
                    <h6 className='mb-0'>{isLoading ? "..." : formatNumber(card.value)}</h6>
                  </div>
                  <div className={`w-50-px h-50-px ${card.iconBg} rounded-circle d-flex justify-content-center align-items-center`}>
                    <Icon icon={card.icon} className='text-white text-2xl mb-0' />
                  </div>
                </div>
                <p className='fw-medium text-sm text-primary-light mt-12 mb-0 d-flex align-items-center gap-2 flex-wrap'>
                  {card.subtext}
                </p>
              </div>
            </div>
          </div>
        ))}
        {error ? (
          <div className='col-12'>
            <div className='text-danger text-sm fw-semibold mt-2'>{error}</div>
          </div>
        ) : null}
      </div>
    </>
  );
};

UnitCountOne.propTypes = {
  analytics: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
    summary: PropTypes.shape({
      uniqueVisitors: PropTypes.number,
      totalVisits: PropTypes.number,
      todayVisits: PropTypes.number,
      weekVisits: PropTypes.number,
      monthVisits: PropTypes.number,
    }),
    monthly: PropTypes.arrayOf(
      PropTypes.shape({
        year: PropTypes.number,
        month: PropTypes.number,
        totalVisits: PropTypes.number,
        uniqueVisitors: PropTypes.number,
      })
    ),
    pageViews: PropTypes.shape({
      range: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      summary: PropTypes.shape({
        totalVisits: PropTypes.number,
        uniqueVisitors: PropTypes.number,
      }),
    }),
  }),
};

export default UnitCountOne;
