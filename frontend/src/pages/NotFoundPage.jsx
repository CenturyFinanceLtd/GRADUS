import { Link } from "react-router-dom";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";

const NotFoundPage = () => {
    return (
        <>
            <Preloader />
            <Animation />
            <HeaderOne />
            <section className="error-area pt-120 pb-120">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <div className="error-content text-center">
                                <h1 className="error-404">404</h1>
                                <h3 className="error-title">Page Not Found</h3>
                                <p className="error-desc">
                                    The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
                                </p>
                                <Link to="/" className="main-btn">
                                    Back To Home
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <FooterOne />
        </>
    );
};

export default NotFoundPage;
