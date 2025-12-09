import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Tooltip } from 'react-tooltip';
import { scaleLinear } from "d3-scale";

// Reliable TopoJSON for India
// const INDIA_TOPO_JSON = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/india/india-states.json";
// Alternative robust source if the above fails or is slow
const INDIA_TOPO_JSON = "https://raw.githubusercontent.com/geohacker/india/master/district/india_district.json";
// Note: district map might be too detailed, let's stick to states for cleaner UI
const INDIA_STATES_TOPO_JSON = "https://raw.githubusercontent.com/baronwatts/topojson/master/india.json";


const PROJECTION_CONFIG = {
    scale: 1000,
    center: [78.9629, 22.5937] // Center of India
};

const StatisticsMap = () => {
    const [tooltipContent, setTooltipContent] = useState("");

    // Mock Data for Indian States
    const data = [
        { id: 1, state: "Maharashtra", value: 1240, percent: 80, color: "#4F46E5" }, // Indigo
        { id: 2, state: "Karnataka", value: 950, percent: 65, color: "#10B981" },    // Emerald
        { id: 3, state: "Delhi", value: 870, percent: 55, color: "#F59E0B" },        // Amber
        { id: 4, state: "Tamil Nadu", value: 720, percent: 45, color: "#EF4444" },   // Red
        { id: 5, state: "Gujarat", value: 600, percent: 35, color: "#8B5CF6" },      // Violet
    ];

    // Color scale for map based on visitors (optional, but good for heatmapping)
    const colorScale = scaleLinear()
        .domain([0, 1500])
        .range(["#E0E7FF", "#3730A3"]);

    return (
        <div className="col-span-12 lg:col-span-6 bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Top States</h3>
                <select className="border border-gray-300 rounded-md px-3 py-1 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Map Section */}
                <div className="border border-gray-100 rounded-lg p-4 relative bg-gray-50 h-[400px] flex items-center justify-center overflow-hidden">

                    <ComposableMap
                        projection="geoMercator"
                        projectionConfig={PROJECTION_CONFIG}
                        width={600}
                        height={650}
                        style={{ width: "100%", height: "100%" }}
                    >
                        {/* 
                           Note: Use ZoomableGroup if zoom is needed, but fixed state map usually looks better without it for dashboards 
                           Adding simple zoom buttons manually if needed or just use standard SVG transform without ZoomableGroup for stability
                        */}
                        <Geographies geography={INDIA_STATES_TOPO_JSON}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    // Match state name
                                    // Common properties in India TopoJSONs: "st_nm", "NAME_1", "name"
                                    const stateName = geo.properties.st_nm || geo.properties.NAME_1 || geo.properties.name;
                                    const cur = data.find(s => s.state === stateName);

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={cur ? cur.color : "#D1D5DB"} // Use specific color if in top list, else gray
                                            stroke="#FFFFFF"
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: "none" },
                                                hover: { fill: "#F53", outline: "none", cursor: "pointer" },
                                                pressed: { outline: "none" },
                                            }}
                                            onMouseEnter={() => {
                                                const visitors = cur ? cur.value : 'N/A';
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
                    <Tooltip id="my-tooltip" style={{ backgroundColor: "#1F2937", color: "#F9FAFB", borderRadius: "8px" }} />
                </div>

                {/* Stats List Section */}
                <div className="space-y-6 h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs text-white font-bold" style={{ backgroundColor: item.color }}>
                                {item.state.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                    <h4 className="font-semibold text-gray-800">{item.state}</h4>
                                    <span className="font-bold text-gray-900">{item.percent}%</span>
                                </div>
                                <div className="text-sm text-gray-500 mb-2">{item.value.toLocaleString()} Users</div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatisticsMap;
