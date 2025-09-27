import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import InquiriesLayer from "../components/InquiriesLayer";

const InquiryPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Inquiries' />
        <InquiriesLayer />
      </MasterLayout>
    </>
  );
};

export default InquiryPage;
