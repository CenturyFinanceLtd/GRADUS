import { useEffect } from "react";
import SignInInner from "./SignInInner";
import { useLocation } from "react-router-dom";

const SignInModal = ({ isOpen, onClose }) => {
    const location = useLocation();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className='position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center'
            style={{ zIndex: 1050, backgroundColor: "rgba(0,0,0,0.5)" }}
            onClick={onClose}
        >
            <div
                className='bg-white rounded-24 p-24 position-relative shadow-lg'
                style={{ width: "min(500px, 90%)", maxHeight: "90vh", overflowY: "auto" }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    className="position-absolute top-0 end-0 m-16 border-0 bg-transparent text-secondary fs-4"
                    aria-label="Close"
                    onClick={onClose}
                    style={{ zIndex: 10 }}
                >
                    <i className="ph ph-x"></i>
                </button>
                <SignInInner isModal={true} redirectPath={location.pathname} />
            </div>
        </div>
    );
};

export default SignInModal;
