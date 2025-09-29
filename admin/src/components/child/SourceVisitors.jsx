import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import useAuth from "../../hook/useAuth";
import { fetchPageViewStats } from "../../services/adminAnalytics";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

const numberFormatter = new Intl.NumberFormat("en-IN");

const SourceVisitors = () => {
  const { token } = useAuth();
  const [range, setRange] = useState("30d");
  const [stats, setStats] = useState({ pages: [], summary: { totalVisits: 0, uniqueVisitors: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      if (!token) {
        setStats({ pages: [], summary: { totalVisits: 0, uniqueVisitors: 0 } });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchPageViewStats({ token, range, limit: 10 });
        if (!cancelled) {
          setStats({
            pages: Array.isArray(response?.pages) ? response.pages : [],
            summary: response?.summary || { totalVisits: 0, uniqueVisitors: 0 },
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load page view stats");
          setStats({ pages: [], summary: { totalVisits: 0, uniqueVisitors: 0 } });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [token, range]);

  const chartConfig = useMemo(() => {
    const categories = stats.pages.map((page) => page.path || "");
    const data = stats.pages.map((page) => page.totalVisits || 0);
    const height = Math.max(220, categories.length * 56);

    return {
      height,
      options: {
        chart: { type: "bar", toolbar: { show: false } },
        plotOptions: {
          bar: {
            borderRadius: 8,
            horizontal: true,
            barHeight: "60%",
          },
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories,
          labels: {
            formatter: (value) => numberFormatter.format(value),
          },
        },
        yaxis: {
          labels: {
            formatter: (value) => (typeof value === "string" && value.length > 30 ? `${value.slice(0, 30)}…` : value),
          },
        },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (value, { dataPointIndex }) => {
              const page = stats.pages[dataPointIndex];
              const unique = page ? page.uniqueVisitors || 0 : 0;
              return `${numberFormatter.format(value)} views • ${numberFormatter.format(unique)} unique visitors`;
            },
          },
        },
        grid: {
          borderColor: "#E5E7EB",
          strokeDashArray: 4,
        },
        colors: ["#487FFF"],
      },
      series: [
        {
          name: "Page views",
          data,
        },
      ],
    };
  }, [stats]);

  return (
    <div className='col-xxl-6'>
      <div className='card h-100'>
        <div className='card-header border-bottom-0 pb-0 d-flex align-items-center flex-wrap gap-2 justify-content-between'>
          <div>
            <h6 className='mb-1 fw-bold text-lg mb-0'>Page Views</h6>
            <span className='text-secondary-light text-sm'>Track the most visited public pages</span>
          </div>
          <select
            className='form-select form-select-sm w-auto bg-base border text-secondary-light'
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className='card-body'>
          {loading ? (
            <div className='d-flex justify-content-center align-items-center py-48'>
              <div className='spinner-border text-primary' role='status'>
                <span className='visually-hidden'>Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className='text-danger text-center fw-medium py-32'>{error}</div>
          ) : stats.pages.length === 0 ? (
            <div className='text-secondary-light text-center py-32'>No page views have been recorded yet.</div>
          ) : (
            <>
              <div className='d-flex flex-wrap justify-content-between align-items-center mb-16 gap-3'>
                <div>
                  <span className='text-secondary-light d-block text-sm'>Total views</span>
                  <h6 className='mb-0'>{numberFormatter.format(stats.summary.totalVisits || 0)}</h6>
                </div>
                <div>
                  <span className='text-secondary-light d-block text-sm'>Unique visitors</span>
                  <h6 className='mb-0'>{numberFormatter.format(stats.summary.uniqueVisitors || 0)}</h6>
                </div>
              </div>
              <ReactApexChart
                options={chartConfig.options}
                series={chartConfig.series}
                type='bar'
                height={chartConfig.height}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SourceVisitors;
