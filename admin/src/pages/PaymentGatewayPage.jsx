import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import PaymentGatewayLayer from "../components/PaymentGatewayLayer";

const PaymentGatewayPage = () => {
  return (
    <>
      <MasterLayout>
        <Breadcrumb title='Settings - Payment Gateway' />
        <PaymentGatewayLayer />
      </MasterLayout>
    </>
  );
};

export default PaymentGatewayPage;

