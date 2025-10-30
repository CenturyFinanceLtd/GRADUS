import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import TicketDetailsLayer from "../components/TicketDetailsLayer";

const TicketDetailsPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Ticket Details' />
        <TicketDetailsLayer />
      </MasterLayout>
    </>
  );
};

export default TicketDetailsPage;

