import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import LandingPagesListLayer from "../components/LandingPagesListLayer";

const LandingPagesListPage = () => {
    return (
        <>
            <MasterLayout>
                <Breadcrumb title='Landing Pages' />
                <LandingPagesListLayer />
            </MasterLayout>
        </>
    );
};

export default LandingPagesListPage;
