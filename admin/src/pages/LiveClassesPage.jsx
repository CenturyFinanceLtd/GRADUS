import MasterLayout from '../masterLayout/MasterLayout';
import Breadcrumb from '../components/Breadcrumb';
import LiveClassManager from '../components/liveSessions/LiveClassManager';

const LiveClassesPage = () => {
  return (
    <MasterLayout>
      <Breadcrumb title='Live Classes' />
      <LiveClassManager />
    </MasterLayout>
  );
};

export default LiveClassesPage;
