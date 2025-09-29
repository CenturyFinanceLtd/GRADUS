import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../../hook/useAuth";
import { fetchVisitorSummary } from "../../services/adminAnalytics";

const numberFormatter = new Intl.NumberFormat("en-IN");

const UpgradeYourPlan = () => {
  const { token } = useAuth();
  const [visitorSummary, setVisitorSummary] = useState({
    uniqueVisitors: 0,
    totalVisits: 0,
    todayVisits: 0,
  });
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [visitorError, setVisitorError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadVisitorSummary = async () => {
      if (!token) {
        setVisitorSummary({ uniqueVisitors: 0, totalVisits: 0, todayVisits: 0 });
        setLoadingVisitors(false);
        return;
      }

      setLoadingVisitors(true);
      setVisitorError(null);

      try {
        const response = await fetchVisitorSummary({ token });
        if (!cancelled) {
          setVisitorSummary({
            uniqueVisitors: response?.uniqueVisitors || 0,
            totalVisits: response?.totalVisits || 0,
            todayVisits: response?.todayVisits || 0,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setVisitorError(error?.message || "Unable to load visitor data");
          setVisitorSummary({ uniqueVisitors: 0, totalVisits: 0, todayVisits: 0 });
        }
      } finally {
        if (!cancelled) {
          setLoadingVisitors(false);
        }
      }
    };

    loadVisitorSummary();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const visitorCountLabel = loadingVisitors
    ? "…"
    : numberFormatter.format(visitorSummary.uniqueVisitors || 0);

  const visitorSubLabel = loadingVisitors
    ? "Updating metrics"
    : visitorError
    ? visitorError
    : `${numberFormatter.format(visitorSummary.totalVisits || 0)} total visits • ${numberFormatter.format(
        visitorSummary.todayVisits || 0
      )} today`;

  return (
    <div className='col-xxl-6'>
      <div className='card'>
        <div className='card-body p-20'>
          <div className='row g-3'>
            <div className='col-md-4'>
              <div className='trail-bg h-100 text-center d-flex flex-column justify-content-between align-items-center p-16 radius-8'>
                <h6 className='text-white text-xl'>Upgrade Your Plan</h6>
                <div className=''>
                  <p className='text-white'>
                    Your free trial expired in 7 days
                  </p>
                  <Link
                    to='#'
                    className='btn py-8 rounded-pill w-100 bg-gradient-blue-warning text-sm'
                  >
                    Upgrade Now
                  </Link>
                </div>
              </div>
            </div>
            <div className='col-md-8'>
              <div className='row g-3'>
                <div className='col-sm-6 col-xs-6'>
                  <div className='radius-8 h-100 text-center p-20 bg-purple-light'>
                    <span className='w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-xl mb-12 bg-lilac-200 border border-lilac-400 text-lilac-600'>
                      <i className='ri-price-tag-3-fill' />
                    </span>
                    <span className='text-neutral-700 d-block'>
                      Total Sales
                    </span>
                    <h6 className='mb-0 mt-4'>$170,500.09</h6>
                  </div>
                </div>
                <div className='col-sm-6 col-xs-6'>
                  <div className='radius-8 h-100 text-center p-20 bg-success-100'>
                    <span className='w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-xl mb-12 bg-success-200 border border-success-400 text-success-600'>
                      <i className='ri-shopping-cart-2-fill' />
                    </span>
                    <span className='text-neutral-700 d-block'>
                      Total Orders
                    </span>
                    <h6 className='mb-0 mt-4'>1,500</h6>
                  </div>
                </div>
                <div className='col-sm-6 col-xs-6'>
                  <div className='radius-8 h-100 text-center p-20 bg-info-focus'>
                    <span className='w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-xl mb-12 bg-info-200 border border-info-400 text-info-600'>
                      <i className='ri-group-3-fill' />
                    </span>
                    <span className='text-neutral-700 d-block'>Visitor</span>
                    <h6 className='mb-0 mt-4'>{visitorCountLabel}</h6>
                    <span className='text-secondary-light text-xs mt-4 d-block'>{visitorSubLabel}</span>
                  </div>
                </div>
                <div className='col-sm-6 col-xs-6'>
                  <div className='radius-8 h-100 text-center p-20 bg-danger-100'>
                    <span className='w-44-px h-44-px radius-8 d-inline-flex justify-content-center align-items-center text-xl mb-12 bg-danger-200 border border-danger-400 text-danger-600'>
                      <i className='ri-refund-2-line' />
                    </span>
                    <span className='text-neutral-700 d-block'>Refunded</span>
                    <h6 className='mb-0 mt-4'>2756</h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeYourPlan;
