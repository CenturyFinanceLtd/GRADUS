import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const ProfileInner = () => {
  const { token, updateUser, logout } = useAuth();
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
  });
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profileStatus, setProfileStatus] = useState({ type: "", message: "" });
  const [emailChange, setEmailChange] = useState({
    newEmail: "",
    sessionId: null,
    otp: "",
    status: "idle",
    message: "",
    error: "",
    loading: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
    loading: false,
    error: "",
    message: "",
  });
  const [deleteAccount, setDeleteAccount] = useState({
    sessionId: null,
    otp: "",
    status: "idle",
    message: "",
    error: "",
    loading: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setFetchingProfile(true);
      try {
        const response = await apiClient.get("/users/me", { token });
        setProfileData({
          firstName: response.user.firstName || "",
          lastName: response.user.lastName || "",
          mobile: response.user.mobile || "",
          email: response.user.email || "",
        });
        updateUser(response.user);
      } catch (error) {
        if (error.status === 401) {
          logout();
          navigate("/sign-in", { replace: true });
          return;
        }
        setProfileStatus({ type: "error", message: error.message });
      } finally {
        setFetchingProfile(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token, updateUser, logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/sign-in", { replace: true });
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileStatus({ type: "", message: "" });

    try {
      const response = await apiClient.put(
        "/users/me",
        {
          firstName: profileData.firstName.trim(),
          lastName: profileData.lastName.trim(),
          mobile: profileData.mobile.trim(),
        },
        { token }
      );

      updateUser(response.user);
      setProfileStatus({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setProfileStatus({ type: "error", message: error.message || "Profile update failed." });
    }
  };

  const handleEmailInputChange = (event) => {
    const { name, value } = event.target;
    setEmailChange((prev) => ({ ...prev, [name]: value }));
  };

  const startEmailUpdate = async (event) => {
    event.preventDefault();
    setEmailChange((prev) => ({ ...prev, error: "", message: "", loading: true }));

    try {
      const response = await apiClient.post(
        "/users/email-change/start",
        { newEmail: emailChange.newEmail.trim() },
        { token }
      );

      setEmailChange((prev) => ({
        ...prev,
        sessionId: response.sessionId,
        status: "otp",
        otp: response.devOtp || "",
        message: response.devOtp
          ? `Dev mode: use verification code ${response.devOtp} to verify this change.`
          : `Verification code sent to ${response.email}.`,
        loading: false,
      }));
    } catch (error) {
      setEmailChange((prev) => ({
        ...prev,
        error: error.message || "Could not send verification code.",
        loading: false,
      }));
    }
  };

  const verifyEmailUpdate = async (event) => {
    event.preventDefault();
    setEmailChange((prev) => ({ ...prev, error: "", message: "", loading: true }));

    try {
      const response = await apiClient.post(
        "/users/email-change/verify",
        {
          sessionId: emailChange.sessionId,
          otp: emailChange.otp.trim(),
        },
        { token }
      );

      updateUser(response.user);
      setProfileData((prev) => ({ ...prev, email: response.user.email }));
      setEmailChange({
        newEmail: "",
        sessionId: null,
        otp: "",
        status: "idle",
        message: "Email updated successfully.",
        error: "",
        loading: false,
      });
    } catch (error) {
      setEmailChange((prev) => ({
        ...prev,
        error: error.message || "Verification failed.",
        loading: false,
      }));
    }
  };

  const handleDeleteOtpChange = (event) => {
    const { value } = event.target;
    setDeleteAccount((prev) => ({ ...prev, otp: value }));
  };

  const resetDeleteAccountState = () => {
    setDeleteAccount({
      sessionId: null,
      otp: "",
      status: "idle",
      message: "",
      error: "",
      loading: false,
    });
  };

  const startDeleteAccount = async () => {
    setDeleteAccount((prev) => ({ ...prev, error: "", message: "", loading: true }));

    try {
      const response = await apiClient.post(
        "/users/account-delete/start",
        {},
        { token }
      );

      setDeleteAccount((prev) => ({
        ...prev,
        sessionId: response.sessionId,
        status: "otp",
        otp: response.devOtp || "",
        message: response.devOtp
          ? `Dev mode: use verification code ${response.devOtp} to confirm deletion.`
          : `Verification code sent to ${response.email}.`,
        loading: false,
      }));
    } catch (error) {
      setDeleteAccount((prev) => ({
        ...prev,
        error: error.message || "Could not send verification code.",
        loading: false,
      }));
    }
  };

  const verifyDeleteAccount = async (event) => {
    event.preventDefault();
    setDeleteAccount((prev) => ({ ...prev, error: "", message: "", loading: true }));

    try {
      await apiClient.post(
        "/users/account-delete/verify",
        {
          sessionId: deleteAccount.sessionId,
          otp: deleteAccount.otp.trim(),
        },
        { token }
      );

      setDeleteAccount({
        sessionId: null,
        otp: "",
        status: "idle",
        message: "Account deleted. Redirecting to sign in...",
        error: "",
        loading: false,
      });

      logout();
      navigate("/sign-in", { replace: true });
    } catch (error) {
      setDeleteAccount((prev) => ({
        ...prev,
        error: error.message || "Unable to delete account.",
        loading: false,
      }));
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPasswordUpdate = async (event) => {
    event.preventDefault();
    setPasswordForm((prev) => ({ ...prev, error: "", message: "", loading: true }));

    try {
      await apiClient.put(
        "/users/me/password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmNewPassword: passwordForm.confirmNewPassword,
        },
        { token }
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
        loading: false,
        error: "",
        message: "Password updated successfully.",
      });
    } catch (error) {
      setPasswordForm((prev) => ({
        ...prev,
        error: error.message || "Unable to update password.",
        loading: false,
      }));
    }
  };

  if (fetchingProfile) {
    return (
      <div className='py-120 text-center'>
        <span className='text-neutral-500'>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className='account py-120 position-relative'>
      <div className='container'>
        <div className='row gy-4'>
          <div className='col-lg-8'>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32 mb-32'>
              <div className='d-flex justify-content-between align-items-center mb-24'>
                <h3 className='mb-0 text-neutral-500'>Profile Details</h3>
                <button
                  type='button'
                  className='btn btn-outline-danger rounded-pill d-inline-flex align-items-center gap-8'
                  onClick={handleLogout}
                >
                  Log Out
                  <i className='ph-bold ph-sign-out d-flex text-lg' />
                </button>
              </div>
              {profileStatus.message ? (
                <div
                  className={`alert alert-${profileStatus.type === "success" ? "success" : "danger"} text-sm mb-24`}
                  role='alert'
                >
                  {profileStatus.message}
                </div>
              ) : null}
              <form onSubmit={handleProfileSubmit} className='row gy-4'>
                <div className='col-sm-6'>
                  <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='firstName'>
                    First Name
                  </label>
                  <input
                    type='text'
                    className='common-input rounded-pill'
                    id='firstName'
                    name='firstName'
                    value={profileData.firstName}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className='col-sm-6'>
                  <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='lastName'>
                    Last Name
                  </label>
                  <input
                    type='text'
                    className='common-input rounded-pill'
                    id='lastName'
                    name='lastName'
                    value={profileData.lastName}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className='col-sm-6'>
                  <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='email'>
                    Email Address (verified)
                  </label>
                  <input
                    type='email'
                    className='common-input rounded-pill bg-neutral-20'
                    id='email'
                    value={profileData.email}
                    disabled
                  />
                </div>
                <div className='col-sm-6'>
                  <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='mobile'>
                    Mobile Number
                  </label>
                  <input
                    type='tel'
                    className='common-input rounded-pill'
                    id='mobile'
                    name='mobile'
                    value={profileData.mobile}
                    onChange={handleProfileChange}
                    required
                  />
                </div>
                <div className='col-sm-12'>
                  <button type='submit' className='btn btn-main rounded-pill flex-center gap-8'>
                    Save Changes
                    <i className='ph-bold ph-floppy-disk d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>

            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32'>
              <h3 className='mb-24 text-neutral-500'>Update Password</h3>
              {passwordForm.message ? (
                <div className='alert alert-success text-sm mb-24' role='alert'>
                  {passwordForm.message}
                </div>
              ) : null}
              {passwordForm.error ? (
                <div className='alert alert-danger text-sm mb-24' role='alert'>
                  {passwordForm.error}
                </div>
              ) : null}
              <form onSubmit={submitPasswordUpdate} className='row gy-4'>
                <div className='col-sm-12'>
                  <label
                    className='fw-medium text-lg text-neutral-500 mb-16'
                    htmlFor='currentPassword'
                  >
                    Current Password
                  </label>
                  <input
                    type='password'
                    className='common-input rounded-pill'
                    id='currentPassword'
                    name='currentPassword'
                    value={passwordForm.currentPassword}
                    onChange={handlePasswordChange}
                    autoComplete='current-password'
                    required
                  />
                </div>
                <div className='col-sm-6'>
                  <label
                    className='fw-medium text-lg text-neutral-500 mb-16'
                    htmlFor='newPassword'
                  >
                    New Password
                  </label>
                  <input
                    type='password'
                    className='common-input rounded-pill'
                    id='newPassword'
                    name='newPassword'
                    value={passwordForm.newPassword}
                    onChange={handlePasswordChange}
                    autoComplete='new-password'
                    required
                  />
                </div>
                <div className='col-sm-6'>
                  <label
                    className='fw-medium text-lg text-neutral-500 mb-16'
                    htmlFor='confirmNewPassword'
                  >
                    Confirm Password
                  </label>
                  <input
                    type='password'
                    className='common-input rounded-pill'
                    id='confirmNewPassword'
                    name='confirmNewPassword'
                    value={passwordForm.confirmNewPassword}
                    onChange={handlePasswordChange}
                    autoComplete='new-password'
                    required
                  />
                </div>
                <div className='col-sm-12'>
                  <button
                    type='submit'
                    className='btn btn-main rounded-pill flex-center gap-8'
                    disabled={passwordForm.loading}
                  >
                    {passwordForm.loading ? "Updating..." : "Update Password"}
                    <i className='ph-bold ph-lock-key d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className='col-lg-4'>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32'>
              <h4 className='mb-24 text-neutral-500'>Change Email</h4>
              {emailChange.message ? (
                <div className='alert alert-success text-sm mb-20' role='alert'>
                  {emailChange.message}
                </div>
              ) : null}
              {emailChange.error ? (
                <div className='alert alert-danger text-sm mb-20' role='alert'>
                  {emailChange.error}
                </div>
              ) : null}

              {emailChange.status === "otp" ? (
                <form onSubmit={verifyEmailUpdate} className='row gy-3'>
                  <div className='col-12'>
                    <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='otp'>
                      Enter verification code
                    </label>
                    <input
                      type='text'
                      className='common-input rounded-pill text-center letter-spacing-2'
                      id='otp'
                      name='otp'
                      value={emailChange.otp}
                      onChange={handleEmailInputChange}
                      placeholder='Enter OTP'
                      required
                    />
                  </div>
                  <div className='col-12 d-flex justify-content-between'>
                    <button
                      type='button'
                      className='btn border border-neutral-40 text-neutral-500 rounded-pill'
                      onClick={() =>
                        setEmailChange({
                          newEmail: "",
                          sessionId: null,
                          otp: "",
                          status: "idle",
                          message: "",
                          error: "",
                          loading: false,
                        })
                      }
                      disabled={emailChange.loading}
                    >
                      Cancel
                    </button>
                    <button
                      type='submit'
                      className='btn btn-main rounded-pill'
                      disabled={emailChange.loading}
                    >
                      {emailChange.loading ? "Verifying..." : "Verify"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={startEmailUpdate} className='row gy-3'>
                  <div className='col-12'>
                    <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='newEmail'>
                      New Email Address
                    </label>
                    <input
                      type='email'
                      className='common-input rounded-pill'
                      id='newEmail'
                      name='newEmail'
                      value={emailChange.newEmail}
                      onChange={handleEmailInputChange}
                      placeholder='Enter new email'
                      required
                    />
                  </div>
                  <div className='col-12'>
                    <button
                      type='submit'
                      className='btn btn-main rounded-pill w-100'
                      disabled={emailChange.loading}
                    >
                      {emailChange.loading ? "Sending..." : "Send Verification Code"}
                    </button>
                  </div>
                </form>
              )}
            </div>
            <div className='bg-main-25 border border-neutral-30 rounded-8 p-32 mt-32'>
              <h4 className='mb-24 text-danger'>Delete Account</h4>
              {deleteAccount.message ? (
                <div className='alert alert-success text-sm mb-20' role='alert'>
                  {deleteAccount.message}
                </div>
              ) : null}
              {deleteAccount.error ? (
                <div className='alert alert-danger text-sm mb-20' role='alert'>
                  {deleteAccount.error}
                </div>
              ) : null}

              {deleteAccount.status === "otp" ? (
                <form onSubmit={verifyDeleteAccount} className='row gy-3'>
                  <div className='col-12'>
                    <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='deleteOtp'>
                      Enter verification code
                    </label>
                    <input
                      type='text'
                      className='common-input rounded-pill text-center letter-spacing-2'
                      id='deleteOtp'
                      value={deleteAccount.otp}
                      onChange={handleDeleteOtpChange}
                      placeholder='Enter OTP'
                      required
                    />
                  </div>
                  <div className='col-12 d-flex justify-content-between'>
                    <button
                      type='button'
                      className='btn border border-neutral-40 text-neutral-500 rounded-pill'
                      onClick={resetDeleteAccountState}
                      disabled={deleteAccount.loading}
                    >
                      Cancel
                    </button>
                    <button
                      type='submit'
                      className='btn btn-danger rounded-pill'
                      disabled={deleteAccount.loading}
                    >
                      {deleteAccount.loading ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className='d-grid gap-3'>
                  <p className='text-neutral-500'>
                    Permanently remove your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    type='button'
                    className='btn btn-danger rounded-pill'
                    onClick={startDeleteAccount}
                    disabled={deleteAccount.loading}
                  >
                    {deleteAccount.loading ? "Sending code..." : "Send Verification Code"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileInner;
