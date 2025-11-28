const CancellationRefundsContent = () => {
  return (
    <section className='privacy-policy py-120'>
      <div className='container'>
        <div className='row justify-content-center'>
          <div className='col-lg-10'>
            <article className='d-flex flex-column gap-32 text-neutral-700'>
              <header className='d-flex flex-column gap-12'>
                <h1 className='mb-8'>Cancellation and Refunds</h1>
                <p className='text-neutral-500 mb-0'>Last updated on November 27, 2025</p>
                <p className='mb-0'>There is no cancellation once enrolled for the course. For refund queries, email <a href='mailto:contact@gradusindia.in'>contact@gradusindia.in</a>.</p>
              </header>

              <section className='d-flex flex-column gap-12'>
                <h2 className='text-2xl fw-semibold mb-0'>Refund clause</h2>
                <p className='mb-0'>
                  If a student is not placed within the stipulated placement window defined by Gradus, the entire fee
                  paid will be refunded without any deductions.
                </p>
                <p className='mb-0'>The refund is governed by the following conditions:</p>
                <ul className='list-dotted d-flex flex-column gap-12'>
                  <li className='mb-0'>Successful completion of assessment.</li>
                  <li className='mb-0'>Compliance with all academic requirements.</li>
                  <li className='mb-0'>Adherence to attendance and conduct norms.</li>
                  <li className='mb-0'>Submission of required documents.</li>
                </ul>
                <p className='mb-0'>Approved refunds will be processed digitally through the original mode of payment.</p>
              </section>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CancellationRefundsContent;
