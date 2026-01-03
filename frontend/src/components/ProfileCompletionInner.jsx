import "../styles/auth.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import apiClient from "../services/apiClient.js";

const ProfileCompletionInner = ({ isModal = false }) => {
    const { user, token, updateUser } = useAuth();
    const [formData, setFormData] = useState({
        fullname: user?.fullname || "",
        email: user?.email || "",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!formData.fullname.trim()) {
            setError("Full name is required to personalize your experience.");
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.put("/users/me", {
                fullname: formData.fullname.trim(),
                email: formData.email.trim(),
            }, { token });

            const updatedUserData = response.user || response;
            updateUser(updatedUserData);

            // Navigate to dashboard or home
            navigate("/my-courses", { replace: true });
        } catch (err) {
            setError(err.message || "Failed to update profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = async () => {
        setLoading(true);
        try {
            // Set a default name so the AuthGuard passes
            const response = await apiClient.put("/users/me", {
                fullname: "New User",
            }, { token });

            const updatedUserData = response.user || response;
            updateUser(updatedUserData);

            navigate("/my-courses", { replace: true });
        } catch (err) {
            console.error("Skip failed", err);
            setError("Could not skip. Please enter your name to proceed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`signin-modern__card ${isModal ? "border-0 shadow-none p-0" : ""}`}>
            <div className='signin-modern__logo'>
                <img src='/assets/images/logo/logo.png' alt='Gradus logo' loading='lazy' />
            </div>
            <div className='signin-modern__header'>
                <h1 className='signin-modern__title'>Complete Your Profile</h1>
                <p className="signin-modern__subtitle">Tell us a bit about yourself to personalize your experience.</p>
            </div>

            <form onSubmit={handleSubmit}>
                {error ? (
                    <div className='signin-modern__alert signin-modern__alert--error' role='alert' aria-live='assertive'>
                        {error}
                    </div>
                ) : null}

                <div className='signin-modern__body'>
                    <div className='signin-modern__field-group'>
                        <label htmlFor='fullname' className='signin-modern__label'>
                            Full Name
                        </label>
                        <input
                            id='fullname'
                            name='fullname'
                            type='text'
                            className='signin-modern__input'
                            placeholder='Enter your full name'
                            value={formData.fullname}
                            onChange={handleChange}
                            autoComplete='name'
                            required
                        />
                    </div>

                    <div className='signin-modern__field-group'>
                        <label htmlFor='email' className='signin-modern__label'>
                            Email Address (Optional)
                        </label>
                        <input
                            id='email'
                            name='email'
                            type='email'
                            className='signin-modern__input'
                            placeholder='name@domain.com'
                            value={formData.email}
                            onChange={handleChange}
                            autoComplete='email'
                        />
                    </div>

                    <button type='submit' className='signin-modern__cta' disabled={loading || !formData.fullname.trim()}>
                        {loading ? "Saving..." : "Finish Setup"}
                    </button>

                    <button
                        type='button'
                        className='signin-modern__social-btn google signin-modern__social-btn--ghost'
                        onClick={handleSkip}
                        disabled={loading}
                    >
                        Skip for now
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileCompletionInner;
