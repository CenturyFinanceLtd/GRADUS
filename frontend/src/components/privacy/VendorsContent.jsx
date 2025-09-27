const VendorsContent = () => {
  return (
    <section className='privacy-policy py-120'>
      <div className='container'>
        <div className='row justify-content-center'>
          <div className='col-lg-10'>
            <article className='d-flex flex-column gap-32 text-neutral-700'>
              <header className='d-flex flex-column gap-12'>
                <h1 className='mb-8'>Vendors:</h1>
              </header>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Categories of Personal Information (including sensitive personal information) that we process:</h2>
                <p className='mb-0'>Vendor name and contact details, address, tax related details, Contact details of Vendor POC</p>
                <p className='mb-0'>* Please note that the categories of personal (or sensitive personal) details processed may differ based on the business requirement of the entity and legal requirement of a country.</p>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Use of your Personal Information</h2>
                <p className='mb-0'>We use your Personal Information for the following purposes:</p>
                <ul className='list-dotted d-flex flex-column gap-12'>
                  <li className='mb-0'>For vendor empanelment</li>
                  <li className='mb-0'>Purchase order and Invoice creation.</li>
                  <li className='mb-0'>For facilitating communications with you</li>
                  <li className='mb-0'>For submitting quotations</li>
                </ul>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Legal Basis of Processing:</h2>
                <p className='mb-0'>We process your Personal Information when it is necessary for the performance of a contract to which you are the party or based on your consent, as per applicable laws.</p>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Data Recipients/Accessible to:</h2>
                <p className='mb-0'>Your data may be accessible to authorized Internal recipients within Gradus, its subsidiaries or affiliates, our authorized service providers including cloud service providers who provide services to Gradus, tax consultants and authorities, Government Bodies including statutory, regulatory authorities, law-enforcement agencies (where applicable), Auditors (internal/external).</p>
                <p className='mb-0'>For reference to our additional privacy practices regarding data security, retention, transfers (if any), and helping you exercise your rights, as applicable, please refer to our Global Privacy Statement.</p>
              </section>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorsContent;
