import { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hook/useAuth";
import getHomePath from "../helper/getHomePath";

const SignInLayer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, token, admin } = useAuth();
  const homePath = getHomePath(admin?.role);

  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
    remember: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      const redirectTo = location.state?.from || homePath;
      navigate(redirectTo, { replace: true });
    }
  }, [admin?.role, homePath, location.state, navigate, token]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formValues.email || !formValues.password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      await login(formValues.email, formValues.password);
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className='auth bg-base d-flex flex-wrap'>
      <div className='auth-left d-lg-block d-none'>
        <div className='d-flex align-items-center flex-column h-100 justify-content-center'>
          <img src='assets/images/auth/auth-img.png' alt='Gradus admin portal illustration' />
        </div>
      </div>
      <div className='auth-right py-32 px-24 d-flex flex-column justify-content-center'>
        <div className='max-w-464-px mx-auto w-100'>
          <div>
            <Link to={homePath} className='mb-40 max-w-290-px'>
              <img src='assets/images/logo.png' alt='Gradus Logo' />
            </Link>
            <h4 className='mb-12'>Sign In to your Account</h4>
            <p className='mb-24 text-secondary-light text-lg'>
              Welcome back! Please enter your details to access the admin portal.
            </p>
            {error && (
              <div className='alert alert-danger py-12 px-16 mb-24' role='alert'>
                {error}
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} noValidate>
            <div className='icon-field mb-16'>
              <span className='icon top-50 translate-middle-y'>
                <Icon icon='mage:email' />
              </span>
              <input
                type='email'
                name='email'
                value={formValues.email}
                onChange={handleChange}
                className='form-control h-56-px bg-neutral-50 radius-12'
                placeholder='Email'
                autoComplete='email'
                required
                disabled={loading}
              />
            </div>
            <div className='position-relative mb-20'>
              <div className='icon-field'>
                <span className='icon top-50 translate-middle-y'>
                  <Icon icon='solar:lock-password-outline' />
                </span>
                <input
                  type='password'
                  name='password'
                  value={formValues.password}
                  onChange={handleChange}
                  className='form-control h-56-px bg-neutral-50 radius-12'
                  placeholder='Password'
                  autoComplete='current-password'
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className='d-flex justify-content-between gap-2'>
              <div className='form-check style-check d-flex align-items-center'>
                <input
                  className='form-check-input border border-neutral-300'
                  type='checkbox'
                  id='remember'
                  name='remember'
                  checked={formValues.remember}
                  onChange={handleChange}
                  disabled={loading}
                />
                <label className='form-check-label' htmlFor='remember'>
                  Remember me
                </label>
              </div>
              <Link to='/forgot-password' className='text-primary-600 fw-medium'>
                Forgot Password?
              </Link>
            </div>
            <button
              type='submit'
              className='btn btn-primary text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32'
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
            <div className='mt-32 text-center text-sm'>
              <p className='mb-0'>
                Don't have an account? {" "}
                <Link to='/sign-up' className='text-primary-600 fw-semibold'>
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default SignInLayer;