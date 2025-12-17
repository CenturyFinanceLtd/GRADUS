import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import LandingPageFormLayer from "../components/LandingPageFormLayer";

const AddLandingPagePage = () => {
    return (
        <>
            <MasterLayout>
                <Breadcrumb title='Add Landing Page' />
                <LandingPageFormLayer />
            </MasterLayout>
        </>
    );
};

export default AddLandingPagePage;
