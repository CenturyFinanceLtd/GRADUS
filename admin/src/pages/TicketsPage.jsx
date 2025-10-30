import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import TicketsLayer from "../components/TicketsLayer";

const TicketsPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Support Tickets' />
        <TicketsLayer />
      </MasterLayout>
    </>
  );
};

export default TicketsPage;

