const PageTitle = ({ title, breadcrumbItems = [] }) => {
  return (
    <div className='d-flex align-items-center justify-content-between mb-24'>
      <div>
        <p className='text-uppercase text-muted mb-2 small'>
          {breadcrumbItems.length ? breadcrumbItems.join(' / ') : 'Application'}
        </p>
        <h3 className='mb-0'>{title}</h3>
      </div>
    </div>
  );
};

export default PageTitle;
