const EmployeeAndAlumniContent = () => {
  return (
    <section className='privacy-policy py-120'>
      <div className='container'>
        <div className='row justify-content-center'>
          <div className='col-lg-10'>
            <article className='d-flex flex-column gap-32 text-neutral-700'>
              <header className='d-flex flex-column gap-12'>
                <h1 className='mb-8'>Employee and Alumni</h1>
                <p className='mb-0'>Detailed privacy notice for our employees will be provided at the time of onboarding. For our alumni, a detailed privacy notice is available on our Alumni Portal.</p>
              </header>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Categories of Personal Information (including sensitive personal information) that we process:</h2>
                <p className='mb-0'>Contact Details, Family Particulars, Educational Qualifications, Personal Details, Work experience details, National identification information, Official Identifications details, Salary, Compensation, taxation, benefits, claims and other financial information, Performance and development records, Digital Access and IT related information, Travel-related records, Health and safety records, Background checks and screening details, Leave and Attendance records, Information we obtain from monitoring the use of our official systems and networks (as permitted by applicable laws).</p>
                <p className='mb-0'>* Please note that the categories of personal (or sensitive personal) details processed may differ based on the business requirement of the entity and legal requirement of a country.</p>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Use of your Personal Information:</h2>
                <p className='mb-0'>We use your Personal Information for the following purposes:</p>
                <ul className='list-dotted d-flex flex-column gap-12'>
                  <li className='mb-0'>To assist in the onboarding you as an employee, other associated processes, and to carry out various employment related activities and to enable us to ensure that we are compliant with any applicable labour and/or other relevant laws.</li>
                  <li className='mb-0'>As an alumni/ex-employee, to contact you and enable you to take part in our alumni related engagements, be a part of the alumni community, help you with documents and details related to your employment with Gradus, share current job opportunities at Gradus and enable you to apply for them (where applicable).</li>
                </ul>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Legal Basis of Processing:</h2>
                <p className='mb-0'>The above data elements are collected under one or more of the following lawful basis of processing –</p>
                <ul className='list-dotted d-flex flex-column gap-12'>
                  <li className='mb-0'>Performance of a contract</li>
                  <li className='mb-0'>Legal Obligation</li>
                  <li className='mb-0'>Legitimate business interest</li>
                  <li className='mb-0'>Consent</li>
                </ul>
              </section>
              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Data Recipients/Accessible to:</h2>
                <p className='mb-0'>Your Personal Data will be accessible to certain authorized Gradus employees in internal functions such as Human Resources, Finance, Project Delivery Units, etc.; and to our authorized service providers or agents who may require access to the same for processing in relation to the above stated purpose(s); Government Bodies including statutory, regulatory authorities, law-enforcement agencies (where applicable); Auditors (internal/external); Gradus’ Clients (where applicable) based on contractual obligation; Any other parties expressly or impliedly authorized by you for receiving such disclosures.</p>
                <p className='mb-0'>For reference to our additional privacy practices regarding data security, retention, transfers (if any), and helping you exercise your rights, as applicable, please refer to our Global Privacy Statement.</p>
              </section>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmployeeAndAlumniContent;
