import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import EventRegistrationsTable from "../components/EventRegistrationsTable";

const EventRegistrationsPage = () => (
  <MasterLayout>
    <Breadcrumb title='Event Registrations' />
    <EventRegistrationsTable />
  </MasterLayout>
);

export default EventRegistrationsPage;

