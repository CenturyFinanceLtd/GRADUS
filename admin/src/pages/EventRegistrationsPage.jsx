import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import EventRegistrationsTable from "../components/EventRegistrationsTable";
import EventEmailTemplateManager from "../components/EventEmailTemplateManager";

const EventRegistrationsPage = () => (
  <MasterLayout>
    <Breadcrumb title='Event Registrations' />
    <EventRegistrationsTable />
    <EventEmailTemplateManager />
  </MasterLayout>
);

export default EventRegistrationsPage;
