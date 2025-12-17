import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import LandingPageFormLayer from "../components/LandingPageFormLayer";
import { useParams } from 'react-router-dom';

const EditLandingPagePage = () => {
    const { slug } = useParams();
    return (
        <>
            <MasterLayout>
                <Breadcrumb title='Edit Landing Page' />
                <LandingPageFormLayer slug={slug} />
            </MasterLayout>
        </>
    );
};

export default EditLandingPagePage;
