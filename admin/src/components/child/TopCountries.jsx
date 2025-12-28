import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Tooltip } from 'react-tooltip';

// Reliable TopoJSON for India
const INDIA_STATES_TOPO_JSON = "https://raw.githubusercontent.com/Anujarya300/bubble_maps/master/data/geography-data/india.topo.json";

const PROJECTION_CONFIG = {
  scale: 1000,
  center: [78.9629, 22.5937] // Center of India
};


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
              {/* Map Section */}
              <div className="h-100 border radius-8 overflow-hidden relative" style={{ minHeight: '300px' }}>
                <ComposableMap
                  projection="geoMercator"
                  projectionConfig={PROJECTION_CONFIG}
                  width={600}
                  height={650}
                  style={{ width: "100%", height: "100%" }}
                >
                  <Geographies geography={INDIA_STATES_TOPO_JSON}>
                    {({ geographies }) =>
                      geographies.map((geo) => {
                        const stateName = geo.properties.st_nm || geo.properties.NAME_1 || geo.properties.name;
                        const cur = data.find(s => s.state && stateName && s.state.toLowerCase() === stateName.toLowerCase());

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={cur ? cur.color : "#D1D5DB"}
                            stroke="#FFFFFF"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: "none" },
                              hover: { fill: "#F53", outline: "none", cursor: "pointer" },
                              pressed: { outline: "none" },
                            }}
                            onMouseEnter={() => {
                              const visitors = cur ? cur.value : 0;
                              setTooltipContent(`${stateName}: ${visitors} Visitors`);
                            }}
                            onMouseLeave={() => {
                              setTooltipContent("");
                            }}
                            data-tooltip-id="my-tooltip"
                            data-tooltip-content={tooltipContent}
                          />
                        );
                      })
                    }
                  </Geographies>
                </ComposableMap>
                <Tooltip id="my-tooltip" style={{ backgroundColor: "#1F2937", color: "#F9FAFB", borderRadius: "8px", zIndex: 9999 }} />
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
