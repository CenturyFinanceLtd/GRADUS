import { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import useAuth from "../../hook/useAuth";
import { fetchMonthlyVisitors } from "../../services/adminAnalytics";

const MONTH_OPTIONS = [
  { value: 6, label: "Last 6 months" },
  { value: 12, label: "Last 12 months" },
  { value: 24, label: "Last 24 months" },
];

const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });
const numberFormatter = new Intl.NumberFormat("en-IN");

const AverageDailySales = () => {
  const { token } = useAuth();
  const [months, setMonths] = useState(12);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadMonthlyVisitors = async () => {
      if (!token) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetchMonthlyVisitors({ token, months });
        if (!cancelled) {
          setData(Array.isArray(response?.months) ? response.months : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load visitor trend");
          setData([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadMonthlyVisitors();

    return () => {
      cancelled = true;
    };
  }, [token, months]);

  const chartConfig = useMemo(() => {
    const categories = data.map((item) => {
      const date = new Date(Date.UTC(item.year, item.month - 1, 1));
      return dateFormatter.format(date);
    });

    const totals = data.map((item) => item.totalVisits || 0);
    const uniques = data.map((item) => item.uniqueVisitors || 0);

    return {
      categories,
      series: [
        {
          name: "Total visits",
          data: totals,
        },
        {
          name: "Unique visitors",
          data: uniques,
        },
      ],
      options: {
        chart: { type: "bar", stacked: false, toolbar: { show: false } },
        plotOptions: {
          bar: {
            columnWidth: "50%",
            borderRadius: 6,
          },
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories,
          labels: { rotate: -45 },
        },
        yaxis: {
          labels: {
            formatter: (value) => numberFormatter.format(value),
          },
        },
        tooltip: {
          shared: true,
          intersect: false,
          y: {
            formatter: (value) => numberFormatter.format(value),
          },
        },
        legend: {
          position: "top",
          horizontalAlign: "left",
        },
        colors: ["#487FFF", "#22C55E"],
        grid: {
          borderColor: "#E5E7EB",
          strokeDashArray: 4,
        },
      },
    };
  }, [data]);

  const latestMonth = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className='col-xxl-4 col-xl-6'>
      <div className='card h-100'>
        <div className='card-body p-24'>
          <div className='d-flex align-items-center flex-wrap gap-2 justify-content-between'>
            <div>
              <h6 className='mb-1 fw-bold text-lg mb-0'>Monthly Visitors</h6>
              <span className='text-secondary-light text-sm'>Real traffic measured on gradusindia.in</span>
            </div>
            <select
              className='form-select form-select-sm w-auto bg-base border text-secondary-light'
              value={months}
              onChange={(event) => setMonths(Number(event.target.value))}
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className='mt-20'>
            {loading ? (
              <div className='d-flex justify-content-center align-items-center py-48'>
                <div className='spinner-border text-primary' role='status'>
                  <span className='visually-hidden'>Loading...</span>
                </div>
              </div>
            ) : error ? (
              <div className='text-danger text-center fw-medium py-32'>{error}</div>
            ) : data.length === 0 ? (
              <div className='text-secondary-light text-center py-32'>No visitor data has been recorded yet.</div>
            ) : (
              <>
                <div className='d-flex justify-content-between flex-wrap gap-3 mb-20'>
                  <div>
                    <span className='text-secondary-light d-block text-sm'>Most recent month</span>
                    <h6 className='mb-0'>
                      {latestMonth
                        ? `${numberFormatter.format(latestMonth.uniqueVisitors || 0)} unique · ${numberFormatter.format(
                            latestMonth.totalVisits || 0
                          )} visits`
                        : "—"}
                    </h6>
                  </div>
                </div>
                <ReactApexChart
                  options={chartConfig.options}
                  series={chartConfig.series}
                  type='bar'
                  height={280}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AverageDailySales;
