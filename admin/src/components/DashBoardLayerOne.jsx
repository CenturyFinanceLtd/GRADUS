import SalesStatisticOne from "./child/SalesStatisticOne";
import TotalSubscriberOne from "./child/TotalSubscriberOne";
import UsersOverviewOne from "./child/UsersOverviewOne";
import LatestRegisteredOne from "./child/LatestRegisteredOne";
import TopPerformerOne from "./child/TopPerformerOne";
import TopCountries from "./child/TopCountries";
import GeneratedContent from "./child/GeneratedContent";
import UnitCountOne from "./child/UnitCountOne";
import useVisitorAnalytics from "../hook/useVisitorAnalytics";

const DashBoardLayerOne = () => {
  const analytics = useVisitorAnalytics({ months: 14, includePageViews: true });

  return (
    <>
      {/* UnitCountOne */}
      <UnitCountOne analytics={analytics} />

      <section className='row gy-4 mt-1'>
        {/* SalesStatisticOne */}
        <SalesStatisticOne analytics={analytics} />

        {/* TotalSubscriberOne */}
        <TotalSubscriberOne />

        {/* UsersOverviewOne */}
        <UsersOverviewOne />

        {/* LatestRegisteredOne */}
        <LatestRegisteredOne />

        {/* TopPerformerOne */}
        <TopPerformerOne />

        {/* TopCountries */}
        <TopCountries analytics={analytics} />

        {/* GeneratedContent */}
        <GeneratedContent />
      </section>
    </>
  );
};

export default DashBoardLayerOne;
