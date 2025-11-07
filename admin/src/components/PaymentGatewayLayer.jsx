const PaymentGatewayLayer = () => {
  return (
    <div className='card h-100 p-0 radius-12 overflow-hidden'>
      <div className='card-body p-40'>
        <div className='mb-20'>
          <h5 className='mb-8'>Razorpay Configuration</h5>
          <p className='text-neutral-600 mb-0'>
            These settings are currently managed from the backend environment (.env). Use this page as a reference for
            what is configured in the system. Ask engineering to update the server environment for changes to take
            effect.
          </p>
        </div>

        <form className='row g-3'>
          <div className='col-md-6'>
            <label htmlFor='rzpKey' className='form-label fw-semibold text-primary-light text-sm mb-8'>
              Razorpay Key ID
            </label>
            <input id='rzpKey' className='form-control radius-8' placeholder='rzp_****************' defaultValue='' disabled />
          </div>
          <div className='col-md-6'>
            <label htmlFor='rzpSecret' className='form-label fw-semibold text-primary-light text-sm mb-8'>
              Razorpay Key Secret
            </label>
            <input id='rzpSecret' type='password' className='form-control radius-8' placeholder='••••••••••••••••' defaultValue='' disabled />
          </div>
          <div className='col-md-4'>
            <label htmlFor='gst' className='form-label fw-semibold text-primary-light text-sm mb-8'>GST Rate</label>
            <input id='gst' className='form-control radius-8' placeholder='0.18' defaultValue='0.18' disabled />
          </div>
          <div className='col-12'>
            <div className='alert alert-info mt-8' role='alert'>
              To update these values, edit the backend .env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, GST_RATE and restart the server.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentGatewayLayer;

