import React, { useState } from 'react';



const TopCountries = ({ analytics }) => {
  const [tooltipContent, setTooltipContent] = useState("");

  // Use real data if available, otherwise fallback to empty or mock for demo if preferred (but prompt asked for real ones)
  // Analytics.locations is expected to be [{ state: "StateName", value: 123, country: "IN" }]
  const realData = analytics?.locations || [];

  // Aggregate data for map display - ensure matching state names with TopoJSON
  // Note: TopoJSON names can vary. Using simple matching.

  const totalVisitors = realData.reduce((acc, curr) => acc + curr.value, 0);

  const data = realData.length > 0 ? realData.map((item, index) => ({
    id: index,
    state: item.state,
    value: item.value,
    percent: totalVisitors > 0 ? Math.round((item.value / totalVisitors) * 100) : 0,
    color: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][index % 5] // Cycle colors
  })) : [];

  return (
    <div className='col-xxl-6 col-xl-12'>
      <div className='card h-100'>
        <div className='card-body'>
          <div className='d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20'>
            <h6 className='mb-2 fw-bold text-lg mb-0'>Top States (Real-time)</h6>
            <select
              className='form-select form-select-sm w-auto bg-base border text-secondary-light'
              defaultValue='Today'
            >
              <option value='Today'>Today</option>
              <option value='Weekly'>Weekly</option>
              <option value='Monthly'>Monthly</option>
              <option value='Yearly'>Yearly</option>
            </select>
          </div>
          <div className='row gy-4'>
            <div className='col-lg-6'>
              {/* Map Section Removed due to react-simple-maps issues */}
              <div className="h-100 border radius-8 overflow-hidden relative d-flex align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                <span className="text-secondary">Map visualization inactive</span>
              </div>
            </div>
            <div className='col-lg-6'>
              <div className='h-100 border p-16 pe-0 radius-8'>
                <div className='max-h-266-px overflow-y-auto scroll-sm pe-16'>
                  {data.length === 0 && <div className="text-center text-gray-500 py-4">No visitor location data available yet.</div>}
                  {data.map((item) => (
                    <div key={item.id} className='d-flex align-items-center justify-content-between gap-3 mb-12 pb-2'>
                      <div className='d-flex align-items-center w-100'>
                        <div className='w-40-px h-40-px rounded-circle flex-shrink-0 me-12 d-flex align-items-center justify-content-center text-white font-bold' style={{ backgroundColor: item.color }}>
                          {item.state ? item.state.substring(0, 2).toUpperCase() : "??"}
                        </div>
                        <div className='flex-grow-1'>
                          <h6 className='text-sm mb-0'>{item.state}</h6>
                          <span className='text-xs text-secondary-light fw-medium'>
                            {item.value.toLocaleString()} Users
                          </span>
                        </div>
                      </div>
                      <div className='d-flex align-items-center gap-2 w-100'>
                        <div className='w-100 max-w-66 ms-auto'>
                          <div
                            className='progress progress-sm rounded-pill'
                            role='progressbar'
                            aria-valuenow={item.percent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className='progress-bar rounded-pill'
                              style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                        <span className='text-secondary-light font-xs fw-semibold'>
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopCountries;
