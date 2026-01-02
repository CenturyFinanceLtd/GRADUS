import React from "react";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";
import LandingPageRegistrationsTable from "../components/LandingPageRegistrationsTable";

const LandingPageRegistrationsPage = () => {
    return (
        <MasterLayout>
            <Breadcrumb title='Landing Page Registrations' />
            <div className='p-24'>
                <LandingPageRegistrationsTable />
            </div>
        </MasterLayout>
    );
};

export default LandingPageRegistrationsPage;
