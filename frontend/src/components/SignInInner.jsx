import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const SignInInner = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiClient.post("/auth/login", formData);
      setAuth({ token: response.token, user: response.user });
      const redirectOverride = location.state?.redirectTo;
      const pendingEnrollment = location.state?.pendingEnrollment;
      const fromPath = location.state?.from?.pathname;
      let redirectTo = redirectOverride;

      if (!redirectTo) {
        if (fromPath === "/profile") {
          redirectTo = "/";
        } else if (fromPath && !["/sign-in", "/sign-up"].includes(fromPath)) {
          redirectTo = fromPath;
        } else {
          redirectTo = "/profile";
        }
      }

      const nextState =
        pendingEnrollment && redirectTo.includes("/our-courses")
          ? { pendingEnrollment }
          : undefined;

      navigate(redirectTo, { replace: true, state: nextState });
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='account py-120 position-relative'>
      <div className='container'>
        <div className='row gy-4 align-items-center'>
          <div className='col-lg-6'>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32'>
              <div className='mb-40'>
                <h3 className='mb-16 text-neutral-500'>Welcome Back!</h3>
                <p className='text-neutral-500'>Sign in to your account and join us</p>
              </div>
              <form onSubmit={handleSubmit}>
                {error ? (
                  <div className='alert alert-danger text-sm mb-24' role='alert'>
                    {error}
                  </div>
                ) : null}
                <div className='mb-24'>
                  <label
                    htmlFor='email'
                    className='fw-medium text-lg text-neutral-500 mb-16'
                  >
                    Enter Your Email ID
                  </label>
                  <input
                    type='email'
                    className='common-input rounded-pill'
                    id='email'
                    name='email'
                    value={formData.email}
                    onChange={handleChange}
                    placeholder='Enter Your Email...'
                    autoComplete='email'
                    required
                  />
                </div>
                <div className='mb-16'>
                  <label
                    htmlFor='password'
                    className='fw-medium text-lg text-neutral-500 mb-16'
                  >
                    Enter Your Password
                  </label>
                  <div className='position-relative'>
                    <input
                      type={passwordVisible ? "text" : "password"}
                      className='common-input rounded-pill pe-44'
                      id='password'
                      name='password'
                      value={formData.password}
                      onChange={handleChange}
                      placeholder='Enter Your Password...'
                      autoComplete='current-password'
                      required
                    />
                    <span
                      className={`toggle-password position-absolute top-50 inset-inline-end-0 me-16 translate-middle-y ph-bold ${
                        passwordVisible ? "ph-eye" : "ph-eye-closed"
                      }`}
                      onClick={togglePasswordVisibility}
                    ></span>
                  </div>
                </div>
                <div className='mb-16 text-end'>
                  <Link
                    to='/forgot-password'
                    className='text-warning-600 hover-text-decoration-underline'
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className='mb-16'>
                  <p className='text-neutral-500'>
                    Don't have an account?{" "}
                    <Link
                      to='/sign-up'
                      state={location.state}
                      className='fw-semibold text-main-600 hover-text-decoration-underline'
                    >
                      Sign Up
                    </Link>
                  </p>
                </div>
                <div className='mt-40'>
                  <button
                    type='submit'
                    className='btn btn-main rounded-pill flex-center gap-8 mt-40'
                    disabled={loading}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                    <i className='ph-bold ph-arrow-up-right d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className='col-lg-6 d-lg-block d-none'>
            <div className='account-img'>
              <img src='/assets/images/thumbs/account-img.png' alt='' />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInInner;

