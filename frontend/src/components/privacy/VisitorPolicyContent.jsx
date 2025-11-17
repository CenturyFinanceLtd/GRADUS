const VisitorPolicyContent = () => {
  return (
    <section className='privacy-policy py-120'>
      <div className='container'>
        <div className='row justify-content-center'>
          <div className='col-lg-10'>
            <article className='d-flex flex-column gap-32 text-neutral-700'>
              <header className='d-flex flex-column gap-12'>
                <h1 className='mb-8'>Visitor Policy</h1>
                <p className='mb-0'>*Visitor policies are also displayed at the visitors' entrance in Gradus offices.</p>
              </header>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Categories of Personal Information (including sensitive personal information) that we process:</h2>
                <p className='mb-0'>Visitor Name, Contact Details, Organization, Assets Information (if any), Date and purpose of visit, Photograph, and images/footage captured on CCTV or other video and related security/monitoring systems.</p>
                <p className='mb-0'>* Please note that the categories of personal (or sensitive personal) details processed may differ based on the business requirement of the entity and legal requirement of a country.</p>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Use of your Personal Information:</h2>
                <p className='mb-0'>We use your Personal Information for the following purposes:</p>
                <ul className='list-dotted d-flex flex-column gap-12'>
                  <li className='mb-0'>To allow access to Gradus premises.</li>
                </ul>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Legal Basis of processing:</h2>
                <p className='mb-0'>We process your Personal Information when it is necessary for the purposes of a legitimate interest pursued by us or based on your consent, wherever applicable.</p>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Data Recipients/Accessible to:</h2>
                <p className='mb-0'>Your data may be accessible to authorized internal recipients within Gradus, its subsidiaries or affiliates, our authorized service providers including cloud service providers who provide services to Gradus, government bodies including statutory and regulatory authorities, law-enforcement agencies (where applicable), auditors (internal/external), and Gradus' clients (where applicable) based on contractual obligation.</p>
                <p className='mb-0'>For reference to our additional privacy practices regarding data security, retention, transfers (if any), and helping you exercise your rights, as applicable, please refer to our Global Privacy Statement.</p>
              </section>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisitorPolicyContent;
