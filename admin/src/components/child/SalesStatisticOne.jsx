import PropTypes from "prop-types";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import ReactApexChart from "react-apexcharts";

const numberFormatter = new Intl.NumberFormat("en-IN");
const monthFormatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

const formatNumber = (value) => numberFormatter.format(value || 0);

const formatMonthLabel = (year, month) => {
  const date = new Date(Date.UTC(year, month - 1, 1));
  return monthFormatter.format(date);
};

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

const TrendPill = ({ change, loading }) => {
  if (loading || !change) {
    return (
      <span className='text-sm fw-semibold rounded-pill bg-neutral-100 text-secondary-light border px-8 py-4 line-height-1 d-inline-flex align-items-center gap-1'>
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
    <span className={`text-sm fw-semibold rounded-pill ${pillClass} px-8 py-4 line-height-1 d-inline-flex align-items-center gap-1`}>
      <Icon icon={icon} className='text-xs' />
      {isFlat ? "0" : `${sign}${formatNumber(change.delta)}`}
      {change.percent !== null ? ` (${sign}${change.percent.toFixed(1)}%)` : ""}
    </span>
  );
};

TrendPill.propTypes = {
  change: PropTypes.shape({
    delta: PropTypes.number,
    direction: PropTypes.string,
    percent: PropTypes.number,
  }),
  loading: PropTypes.bool,
};

const RANGE_OPTIONS = [
  { value: 6, label: "Last 6 months" },
  { value: 12, label: "Last 12 months" },
  { value: 24, label: "Last 24 months" },
];

const SalesStatisticOne = ({ analytics }) => {
  const [range, setRange] = useState(12);
  const monthly = Array.isArray(analytics?.monthly) ? analytics.monthly : [];
  const isLoading = Boolean(analytics?.loading);
  const error = analytics?.error || null;

  const displayed = monthly.slice(Math.max(monthly.length - range, 0));
  const latest = displayed.length > 0 ? displayed[displayed.length - 1] : { totalVisits: 0, uniqueVisitors: 0 };
  const previous = displayed.length > 1 ? displayed[displayed.length - 2] : null;
  const change = previous ? computeChange(latest.totalVisits, previous.totalVisits) : null;

  const categories = useMemo(
    () => displayed.map((item) => formatMonthLabel(item.year, item.month)),
    [displayed]
  );

  const chartSeries = useMemo(
    () => [
      { name: "Total visits", data: displayed.map((item) => item.totalVisits || 0) },
      { name: "Unique visitors", data: displayed.map((item) => item.uniqueVisitors || 0) },
    ],
    [displayed]
  );

  const chartOptions = useMemo(
    () => ({
      chart: {
        height: 264,
        type: "area",
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3, colors: ["#487FFF", "#22C55E"] },
      markers: { size: 0, strokeWidth: 3, hover: { size: 8 } },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: 0.3,
          opacityTo: 0.05,
          stops: [0, 90, 100],
        },
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (value) => formatNumber(value),
        },
      },
      grid: {
        row: { colors: ["transparent", "transparent"], opacity: 0.5 },
        borderColor: "#D1D5DB",
        strokeDashArray: 3,
      },
      yaxis: {
        labels: {
          formatter: (value) => formatNumber(value),
          style: { fontSize: "14px" },
        },
      },
      xaxis: {
        categories,
        tooltip: { enabled: false },
        labels: {
          rotate: -35,
          formatter: (value) => value,
          style: { fontSize: "12px" },
        },
        axisBorder: { show: false },
        crosshairs: {
          show: true,
          width: 20,
          stroke: { width: 0 },
          fill: { type: "solid", color: "#487FFF40" },
        },
      },
      colors: ["#487FFF", "#22C55E"],
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
      },
    }),
    [categories]
  );

  return (
    <div className='col-xxl-6 col-xl-12'>
      <div className='card h-100'>
        <div className='card-body'>
          <div className='d-flex flex-wrap align-items-center justify-content-between'>
            <h6 className='text-lg mb-0'>Traffic Trend</h6>
            <select
              className='form-select bg-base form-select-sm w-auto'
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className='d-flex flex-wrap align-items-center gap-2 mt-8'>
            <h6 className='mb-0'>
              {isLoading ? "..." : `${formatNumber(latest.totalVisits)} visits`}
            </h6>
            <TrendPill change={change} loading={isLoading} />
            <span className='text-xs fw-medium'>
              {isLoading
                ? "Latest month"
                : `Latest month - ${formatNumber(latest.uniqueVisitors)} unique visitors`}
            </span>
          </div>
          {isLoading ? (
            <div className='d-flex justify-content-center align-items-center py-48'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className='text-danger text-center fw-medium py-32'>{error}</div>
          ) : displayed.length === 0 ? (
            <div className='text-secondary-light text-center py-32'>No visitor data has been recorded yet.</div>
          ) : (
            <ReactApexChart options={chartOptions} series={chartSeries} type='area' height={264} />
          )}
        </div>
      </div>
    </div>
  );
};

SalesStatisticOne.propTypes = {
  analytics: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
    monthly: PropTypes.arrayOf(
      PropTypes.shape({
        year: PropTypes.number,
        month: PropTypes.number,
        totalVisits: PropTypes.number,
        uniqueVisitors: PropTypes.number,
      })
    ),
  }),
};

export default SalesStatisticOne;
