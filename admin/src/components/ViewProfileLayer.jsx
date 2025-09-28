import { Icon } from "@iconify/react/dist/iconify.js";
import { useEffect, useState } from "react";
import useAuth from "../hook/useAuth";
import {
  updateAdminPassword,
  updateAdminProfile,
  startAdminEmailChange,
  verifyAdminEmailChangeCurrent,
  verifyAdminEmailChangeNew,
} from "../services/adminProfile";

const ROLE_LABELS = {
  admin: 'Admin',
  programmer_admin: 'Programmer (Admin)',
  seo: 'SEO',
  sales: 'Sales',
};


const ViewProfileLayer = () => {
  const { admin, token, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    department: "",
    designation: "",
    languages: "",
    bio: "",
    role: "",
  });
  const [profileStatus, setProfileStatus] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [emailStep, setEmailStep] = useState("idle");
  const [newEmailInput, setNewEmailInput] = useState("");
  const [pendingNewEmail, setPendingNewEmail] = useState("");
  const [emailSessionId, setEmailSessionId] = useState("");
  const [currentEmailOtp, setCurrentEmailOtp] = useState("");
  const [newEmailOtp, setNewEmailOtp] = useState("");
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (!admin && token) {
      refreshProfile();
    }
  }, [admin, token, refreshProfile]);

  useEffect(() => {
    if (admin) {
      const roleLabel = ROLE_LABELS[admin.role] || admin.role || "";
      setProfileForm({
        fullName: admin.fullName || "",
        email: admin.email || "",
        phoneNumber: admin.phoneNumber || "",
        department: admin.department || "",
        designation: admin.designation || "",
        languages: Array.isArray(admin.languages)
          ? admin.languages.join(", ")
          : admin.languages || "",
        bio: admin.bio || "",
        role: roleLabel,
      });
    }
  }, [admin]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const renderStatus = (status) => {
    if (!status) {
      return null;
    }
    let className = "alert alert-danger py-12 px-16 mb-16";
    if (status.type === "success") {
      className = "alert alert-success py-12 px-16 mb-16";
    } else if (status.type === "info") {
      className = "alert alert-info py-12 px-16 mb-16";
    }
    return (
      <div className={className} role='alert'>
        {status.message}
      </div>
    );
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setProfileStatus({ type: "error", message: "You must be signed in to update your profile." });
      return;
    }

    setProfileStatus(null);
    setProfileLoading(true);

    const payload = {
      fullName: profileForm.fullName.trim(),
      phoneNumber: profileForm.phoneNumber.trim(),
      department: profileForm.department.trim(),
      designation: profileForm.designation.trim(),
      bio: profileForm.bio.trim(),
      languages: profileForm.languages
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean),
    };

    try {
      await updateAdminProfile(payload, token);
      await refreshProfile();
      setProfileStatus({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setProfileStatus({
        type: "error",
        message: error.message || "We could not update your profile. Please try again.",
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setPasswordStatus({ type: "error", message: "You must be signed in to update your password." });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordStatus({ type: "error", message: "New password and confirmation do not match." });
      return;
    }

    setPasswordStatus(null);
    setPasswordLoading(true);

    try {
      await updateAdminPassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token
      );
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setPasswordStatus({ type: "success", message: "Password updated successfully." });
    } catch (error) {
      setPasswordStatus({
        type: "error",
        message: error.message || "We could not update your password. Please try again.",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const resetEmailFlow = () => {
    setEmailStep("idle");
    setEmailSessionId("");
    setPendingNewEmail("");
    setCurrentEmailOtp("");
    setNewEmailOtp("");
    setEmailStatus(null);
    setEmailLoading(false);
  };

  const handleStartEmailChange = async (event) => {
    event.preventDefault();
    if (!token) {
      setEmailStatus({ type: "error", message: "You must be signed in to update your email." });
      return;
    }

    const trimmedEmail = newEmailInput.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailStatus({ type: "error", message: "Please enter the new email address." });
      return;
    }

    if (trimmedEmail === (profileForm.email || "").toLowerCase()) {
      setEmailStatus({ type: "error", message: "The new email matches your current email." });
      return;
    }

    setEmailLoading(true);
    setEmailStatus(null);

    try {
      const response = await startAdminEmailChange({ newEmail: trimmedEmail }, token);
      setEmailSessionId(response.sessionId);
      setPendingNewEmail(trimmedEmail);
      setEmailStep("verifyCurrent");
      setCurrentEmailOtp("");
      const baseMessage = `We sent a verification code to ${response.currentEmail}. Enter it below to confirm your current email.`;
      const message =
        response.devOtp && response.devOtp.length
          ? `${baseMessage} (Dev OTP: ${response.devOtp})`
          : baseMessage;
      setEmailStatus({ type: "info", message });
    } catch (error) {
      setEmailStatus({
        type: "error",
        message: error.message || "We could not start the email change process. Please try again.",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyCurrentOtp = async (event) => {
    event.preventDefault();
    if (!token) {
      setEmailStatus({ type: "error", message: "You must be signed in to continue." });
      return;
    }
    if (!emailSessionId || !currentEmailOtp.trim()) {
      setEmailStatus({ type: "error", message: "Enter the verification code sent to your current email." });
      return;
    }

    setEmailLoading(true);
    setEmailStatus(null);

    try {
      const response = await verifyAdminEmailChangeCurrent(
        { sessionId: emailSessionId, otp: currentEmailOtp.trim() },
        token
      );
      setEmailSessionId(response.sessionId);
      setEmailStep("verifyNew");
      setCurrentEmailOtp("");
      setNewEmailOtp("");
      const baseMessage = `Great! Now enter the code we sent to ${response.newEmail} to finish updating your email.`;
      const message =
        response.devOtp && response.devOtp.length
          ? `${baseMessage} (Dev OTP: ${response.devOtp})`
          : baseMessage;
      setEmailStatus({ type: "info", message });
    } catch (error) {
      setEmailStatus({
        type: "error",
        message: error.message || "We could not verify the code. Please try again.",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyNewOtp = async (event) => {
    event.preventDefault();
    if (!token) {
      setEmailStatus({ type: "error", message: "You must be signed in to continue." });
      return;
    }
    if (!emailSessionId || !newEmailOtp.trim()) {
      setEmailStatus({ type: "error", message: "Enter the verification code sent to your new email." });
      return;
    }

    setEmailLoading(true);
    setEmailStatus(null);

    try {
      await verifyAdminEmailChangeNew(
        { sessionId: emailSessionId, otp: newEmailOtp.trim() },
        token
      );
      await refreshProfile();
      setEmailStatus({ type: "success", message: "Email address updated successfully." });
      setEmailStep("completed");
      setEmailSessionId("");
      setPendingNewEmail("");
      setNewEmailInput("");
      setNewEmailOtp("");
    } catch (error) {
      setEmailStatus({
        type: "error",
        message: error.message || "We could not verify the new email code. Please try again.",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const roleDisplay = profileForm.role || 'Not specified';
  const languagesDisplay = profileForm.languages || "Not specified";

  return (
    <div className='row gy-4'>
      <div className='col-lg-4'>
        <div className='user-grid-card position-relative border radius-16 overflow-hidden bg-base h-100'>
          <img
            src='assets/images/user-grid/user-grid-bg1.png'
            alt='Gradus admin profile background'
            className='w-100 object-fit-cover'
          />
          <div className='pb-24 ms-16 mb-24 me-16 mt--100'>
            <div className='text-center border border-top-0 border-start-0 border-end-0 pb-24'>
              <img
                src='assets/images/user.png'
                alt='Admin avatar'
                className='border br-white border-width-2-px w-200-px h-200-px rounded-circle object-fit-cover'
              />
              <h6 className='mb-0 mt-16'>{profileForm.fullName || profileForm.email || 'Admin User'}</h6>
              <span className='text-secondary-light mb-16 d-inline-block'>{profileForm.email}</span>
            </div>
            <div className='mt-24'>
              <h6 className='text-xl mb-16'>Personal Info</h6>
              <ul className='list-unstyled'>
                <li className='d-flex align-items-center gap-2 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Full Name</span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {profileForm.fullName || 'Not specified'}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-2 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Email</span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {profileForm.email || 'Not specified'}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-2 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Phone</span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {profileForm.phoneNumber || 'Not specified'}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-2 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Department</span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {profileForm.department || 'Not specified'}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-2 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Designation</span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {profileForm.designation || 'Not specified'}
                  </span>
                </li>
                <li className='d-flex align-items-center gap-2 mb-12'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Languages</span>
                  <span className='w-70 text-secondary-light fw-medium'>: {languagesDisplay}</span>
                </li>
                <li className='d-flex align-items-start gap-2'>
                  <span className='w-30 text-md fw-semibold text-primary-light'>Bio</span>
                  <span className='w-70 text-secondary-light fw-medium'>
                    : {profileForm.bio || 'Not specified'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className='col-lg-8'>
        <div className='card h-100'>
          <div className='card-body p-24'>
            <ul className='nav border-gradient-tab nav-pills mb-24 d-inline-flex'>
              <li className='nav-item'>
                <button
                  type='button'
                  className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Details
                </button>
              </li>
              <li className='nav-item'>
                <button
                  type='button'
                  className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                >
                  Security
                </button>
              </li>
            </ul>

            <div className='tab-content'>
              <div className={`tab-pane fade ${activeTab === 'profile' ? 'show active' : ''}`}>
                {renderStatus(profileStatus)}
                <form onSubmit={handleProfileSubmit} className='row gy-4'>
                  <div className='col-md-6'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Full Name</label>
                    <input
                      type='text'
                      name='fullName'
                      value={profileForm.fullName}
                      onChange={handleProfileChange}
                      className='form-control bg-neutral-50 radius-12 h-56-px'
                      placeholder='Full Name'
                      required
                      disabled={profileLoading}
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Email</label>
                    <input
                      type='email'
                      name='email'
                      value={profileForm.email}
                      className='form-control bg-neutral-100 radius-12 h-56-px'
                      placeholder='Email'
                      disabled
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Phone Number</label>
                    <input
                      type='text'
                      name='phoneNumber'
                      value={profileForm.phoneNumber}
                      onChange={handleProfileChange}
                      className='form-control bg-neutral-50 radius-12 h-56-px'
                      placeholder='Phone Number'
                      disabled={profileLoading}
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Role</label>
                    <input
                      type='text'
                      name='role'
                      value={roleDisplay}
                      className='form-control bg-neutral-100 radius-12 h-56-px'
                      placeholder='Role'
                      disabled
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Department</label>
                    <input
                      type='text'
                      name='department'
                      value={profileForm.department}
                      onChange={handleProfileChange}
                      className='form-control bg-neutral-50 radius-12 h-56-px'
                      placeholder='Department'
                      disabled={profileLoading}
                    />
                  </div>
                  <div className='col-md-6'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Designation</label>
                    <input
                      type='text'
                      name='designation'
                      value={profileForm.designation}
                      onChange={handleProfileChange}
                      className='form-control bg-neutral-50 radius-12 h-56-px'
                      placeholder='Designation'
                      disabled={profileLoading}
                    />
                  </div>
                  <div className='col-12'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Languages</label>
                    <input
                      type='text'
                      name='languages'
                      value={profileForm.languages}
                      onChange={handleProfileChange}
                      className='form-control bg-neutral-50 radius-12 h-56-px'
                      placeholder='e.g. English, Hindi'
                      disabled={profileLoading}
                    />
                  </div>
                  <div className='col-12'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Bio</label>
                    <textarea
                      name='bio'
                      value={profileForm.bio}
                      onChange={handleProfileChange}
                      className='form-control bg-neutral-50 radius-12'
                      rows={4}
                      placeholder='Write a short bio'
                      disabled={profileLoading}
                    />
                  </div>
                  <div className='col-12 d-flex justify-content-end'>
                    <button
                      type='submit'
                      className='btn btn-primary px-24 py-12'
                      disabled={profileLoading}
                    >
                      {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>

                <div className='mt-40 border-top pt-24'>
                  <h6 className='text-lg fw-semibold mb-12'>Change Email Address</h6>
                  {renderStatus(emailStatus)}

                  {emailStep === 'idle' && (
                    <form onSubmit={handleStartEmailChange} className='row gy-3 align-items-end'>
                      <div className='col-md-8'>
                        <label className='form-label text-sm fw-semibold text-secondary-light'>New Email</label>
                        <input
                          type='email'
                          value={newEmailInput}
                          onChange={(event) => setNewEmailInput(event.target.value)}
                          className='form-control bg-neutral-50 radius-12 h-56-px'
                          placeholder='Enter new email address'
                          required
                          disabled={emailLoading}
                        />
                      </div>
                      <div className='col-md-4 d-flex justify-content-end'>
                        <button
                          type='submit'
                          className='btn btn-outline-primary px-24 py-12 w-100'
                          disabled={emailLoading}
                        >
                          {emailLoading ? 'Sending...' : 'Send Verification Code'}
                        </button>
                      </div>
                    </form>
                  )}

                  {emailStep === 'verifyCurrent' && (
                    <form onSubmit={handleVerifyCurrentOtp} className='row gy-3'>
                      <div className='col-12'>
                        <p className='text-secondary-light text-sm mb-0'>
                          Enter the verification code sent to <strong>{profileForm.email}</strong> to confirm your current email.
                        </p>
                      </div>
                      <div className='col-md-6'>
                        <label className='form-label text-sm fw-semibold text-secondary-light'>Verification Code</label>
                        <input
                          type='text'
                          value={currentEmailOtp}
                          onChange={(event) => setCurrentEmailOtp(event.target.value)}
                          className='form-control bg-neutral-50 radius-12 h-56-px'
                          placeholder='Enter code'
                          required
                          disabled={emailLoading}
                        />
                      </div>
                      <div className='col-12 d-flex justify-content-end gap-2'>
                        <button
                          type='button'
                          className='btn btn-light px-24 py-12'
                          onClick={resetEmailFlow}
                          disabled={emailLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type='submit'
                          className='btn btn-primary px-24 py-12'
                          disabled={emailLoading}
                        >
                          {emailLoading ? 'Verifying...' : 'Verify Current Email'}
                        </button>
                      </div>
                    </form>
                  )}

                  {emailStep === 'verifyNew' && (
                    <form onSubmit={handleVerifyNewOtp} className='row gy-3'>
                      <div className='col-12'>
                        <p className='text-secondary-light text-sm mb-0'>
                          Enter the verification code sent to <strong>{pendingNewEmail}</strong> to complete the update.
                        </p>
                      </div>
                      <div className='col-md-6'>
                        <label className='form-label text-sm fw-semibold text-secondary-light'>Verification Code</label>
                        <input
                          type='text'
                          value={newEmailOtp}
                          onChange={(event) => setNewEmailOtp(event.target.value)}
                          className='form-control bg-neutral-50 radius-12 h-56-px'
                          placeholder='Enter code'
                          required
                          disabled={emailLoading}
                        />
                      </div>
                      <div className='col-12 d-flex justify-content-end gap-2'>
                        <button
                          type='button'
                          className='btn btn-light px-24 py-12'
                          onClick={resetEmailFlow}
                          disabled={emailLoading}
                        >
                          Cancel
                        </button>
                        <button
                          type='submit'
                          className='btn btn-primary px-24 py-12'
                          disabled={emailLoading}
                        >
                          {emailLoading ? 'Verifying...' : 'Verify New Email'}
                        </button>
                      </div>
                    </form>
                  )}

                  {emailStep === 'completed' && (
                    <div className='d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3'>
                      <p className='mb-0 text-secondary-light text-sm'>Your email address has been updated.</p>
                      <button
                        type='button'
                        className='btn btn-outline-primary px-24 py-12'
                        onClick={resetEmailFlow}
                      >
                        Change Email Again
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className={`tab-pane fade ${activeTab === 'security' ? 'show active' : ''}`}>
                {renderStatus(passwordStatus)}
                <form onSubmit={handlePasswordSubmit} className='row gy-4'>
                  <div className='col-12'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Current Password</label>
                    <div className='position-relative'>
                      <input
                        type='password'
                        name='currentPassword'
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className='form-control bg-neutral-50 radius-12 h-56-px'
                        placeholder='Current Password'
                        required
                        disabled={passwordLoading}
                      />
                    </div>
                  </div>
                  <div className='col-12'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>New Password</label>
                    <div className='position-relative'>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name='newPassword'
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className='form-control bg-neutral-50 radius-12 h-56-px'
                        placeholder='New Password'
                        required
                        disabled={passwordLoading}
                      />
                      <button
                        type='button'
                        className='toggle-password position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light border-0 bg-transparent'
                        onClick={() => setShowNewPassword((prev) => !prev)}
                      >
                        <Icon icon={showNewPassword ? 'ri:eye-off-line' : 'ri:eye-line'} />
                      </button>
                    </div>
                    <span className='mt-8 d-block text-sm text-secondary-light'>
                      Use at least 8 characters.
                    </span>
                  </div>
                  <div className='col-12'>
                    <label className='form-label text-sm fw-semibold text-secondary-light'>Confirm New Password</label>
                    <div className='position-relative'>
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name='confirmNewPassword'
                        value={passwordForm.confirmNewPassword}
                        onChange={handlePasswordChange}
                        className='form-control bg-neutral-50 radius-12 h-56-px'
                        placeholder='Confirm New Password'
                        required
                        disabled={passwordLoading}
                      />
                      <button
                        type='button'
                        className='toggle-password position-absolute end-0 top-50 translate-middle-y me-16 text-secondary-light border-0 bg-transparent'
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                      >
                        <Icon icon={showConfirmPassword ? 'ri:eye-off-line' : 'ri:eye-line'} />
                      </button>
                    </div>
                  </div>
                  <div className='col-12 d-flex justify-content-end'>
                    <button
                      type='submit'
                      className='btn btn-primary px-24 py-12'
                      disabled={passwordLoading}
                    >
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfileLayer;
