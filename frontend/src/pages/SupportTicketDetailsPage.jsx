import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import SupportTicketDetailsInner from "../components/SupportTicketDetailsInner";

const SupportTicketDetailsPage = () => {
  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <Breadcrumb title={'Ticket Details'} />
      <SupportTicketDetailsInner />
      <FooterOne />
    </>
  );
};

export default SupportTicketDetailsPage;

