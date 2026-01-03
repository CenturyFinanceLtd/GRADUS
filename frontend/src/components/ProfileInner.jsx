import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const safeString = (value) => (typeof value === "string" ? value : "");

const mapUserToProfileState = (user) => ({
  fullname: safeString(user?.fullname),
  phone: safeString(user?.phone || user?.mobile),
  email: safeString(user?.email),
  profileImageUrl: safeString(user?.profileImageUrl),
  personalDetails: {
    address: safeString(user?.personalDetails?.address),
    city: safeString(user?.personalDetails?.city),
    state: safeString(user?.personalDetails?.state),
    zipCode: safeString(user?.personalDetails?.zipCode),
    dob: safeString(user?.personalDetails?.dob),
    gender: safeString(user?.personalDetails?.gender),
  },
  educationDetails: {
    passingYear: safeString(user?.educationDetails?.passingYear),
    fieldOfStudy: safeString(user?.educationDetails?.fieldOfStudy),
    institutionName: safeString(user?.educationDetails?.institutionName),
  },
  jobDetails: {
    company: safeString(user?.jobDetails?.company),
    designation: safeString(user?.jobDetails?.designation),
    experienceYears: safeString(user?.jobDetails?.experienceYears),
    linkedin: safeString(user?.jobDetails?.linkedin),
  },
});

const ProfileInner = () => {
  const { token, updateUser, logout, user: authUser } = useAuth();
  const [profileData, setProfileData] = useState(() => mapUserToProfileState(authUser));
  const [activeTab, setActiveTab] = useState("Personal Info");
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profileStatus, setProfileStatus] = useState({ type: "", message: "" });
  const [uploading, setUploading] = useState(false);


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
    setProfileData(mapUserToProfileState(authUser));
  }, [authUser]);

  useEffect(() => {
    const fetchProfile = async () => {
      setFetchingProfile(true);
      try {
        const response = await apiClient.get("/users/me", { token });
        const userData = response.user || response;
        setProfileData(mapUserToProfileState(userData));
        updateUser(userData);
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
    navigate("/", { replace: true });
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileData((prev) => {
      if (name.includes('.')) {
        const [section, field] = name.split('.');
        return {
          ...prev,
          [section]: {
            ...(prev[section] || {}),
            [field]: value,
          },
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileStatus({ type: "", message: "" });

    try {
      const payload = {
        fullname: profileData.fullname.trim(),
        phone: profileData.phone.trim(),
        profileImageUrl: profileData.profileImageUrl,
        personalDetails: {
          address: profileData.personalDetails.address.trim(),
          city: profileData.personalDetails.city.trim(),
          state: profileData.personalDetails.state.trim(),
          zipCode: profileData.personalDetails.zipCode.trim(),
          dob: profileData.personalDetails.dob.trim(),
          gender: profileData.personalDetails.gender.trim(),
        },
        educationDetails: {
          passingYear: profileData.educationDetails.passingYear.trim(),
          fieldOfStudy: profileData.educationDetails.fieldOfStudy.trim(),
          institutionName: profileData.educationDetails.institutionName.trim(),
        },
        jobDetails: {
          company: profileData.jobDetails.company.trim(),
          designation: profileData.jobDetails.designation.trim(),
          experienceYears: profileData.jobDetails.experienceYears.trim(),
          linkedin: profileData.jobDetails.linkedin.trim(),
        },
      };

      const response = await apiClient.put(
        "/users/me",
        payload,
        { token }
      );

      const userData = response.user || response;
      setProfileData(mapUserToProfileState(userData));
      updateUser(userData);
      setProfileStatus({ type: "success", message: "Profile updated successfully." });
    } catch (error) {
      setProfileStatus({ type: "error", message: error.message || "Profile update failed." });
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setProfileStatus({ type: "", message: "" });
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload via proxy edge function to bypass RLS issues
      const res = await apiClient.post("/users/me/avatar", formData, { token });
      const publicUrl = res.publicUrl;

      if (!publicUrl) throw new Error("Upload failed: No URL returned");

      const publicUrlWithTimestamp = `${publicUrl}?v=${Date.now()}`;
      setProfileData((prev) => ({ ...prev, profileImageUrl: publicUrlWithTimestamp }));

      // Update global user state
      updateUser({ ...authUser, profileImageUrl: publicUrlWithTimestamp });

      setProfileStatus({ type: "success", message: "Profile picture updated!" });
    } catch (error) {
      console.error("Avatar upload error:", error);
      setProfileStatus({ type: "error", message: error.message || "Upload failed." });
    } finally {
      setUploading(false);
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



  if (fetchingProfile) {
    return (
      <div className='py-120 text-center'>
        <span className='text-neutral-700'>Loading your profile...</span>
      </div>
    );
  }

  return (
    <div className='account py-32 position-relative'>
      <style>{`
        .logout-btn {
          transition: all 0.3s ease !important;
        }
        .logout-btn:hover {
          background-color: white !important;
          color: #0d6efd !important;
          border-color: white !important;
        }
        .logout-btn:hover i {
          color: #0d6efd !important;
        }
      `}</style>
      <div className='container'>
        <div className='row gy-4'>
          <div className='col-lg-8'>
            {/* Tabs navigation at the top */}
            <div className='d-flex justify-content-center gap-32 mb-24 border-bottom'>
              {["Personal Info", "Academic Info", "Job Info"].map((tab) => (
                <button
                  key={tab}
                  type='button'
                  className={`pb-12 text-lg fw-semibold position-relative transition-all border-0 bg-transparent ${activeTab === tab ? "text-main" : "text-neutral-400"}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className='position-absolute bottom-0 start-0 w-100 bg-main-600' style={{ height: '3px', borderRadius: '3px 3px 0 0' }} />
                  )}
                </button>
              ))}
            </div>

            {/* Blue Header Card */}
            <div className='bg-main-600 rounded-16 p-24 mb-24 d-flex align-items-center gap-24 text-white shadow-sm'>
              <div className='position-relative'>
                <div
                  className='rounded-circle bg-white overflow-hidden d-flex align-items-center justify-content-center border border-2 border-white shadow-sm cursor-pointer'
                  style={{ width: '80px', height: '80px' }}
                  onClick={() => document.getElementById('profile-pic-upload').click()}
                >
                  {profileData.profileImageUrl ? (
                    <img
                      src={profileData.profileImageUrl}
                      alt='Profile'
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <i className='ph ph-user text-main-600' style={{ fontSize: '40px' }} />
                  )}
                </div>
                <label
                  htmlFor='profile-pic-upload'
                  className='position-absolute bottom-0 end-0 bg-white text-main rounded-circle d-flex align-items-center justify-content-center cursor-pointer border border-2 border-main-600 shadow-sm'
                  style={{ width: '28px', height: '28px', transform: 'translate(10%, 10%)' }}
                >
                  <i className='ph ph-camera text-main-600 text-sm' />
                  <input
                    id='profile-pic-upload'
                    type='file'
                    accept='image/*'
                    className='d-none'
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <div className='flex-grow-1'>
                <h4 className='mb-4 text-white fw-bold'>{profileData.fullname || 'User Name'}</h4>
                <p className='mb-0 text-white text-opacity-75'>{profileData.email}</p>
              </div>
              <button
                type='button'
                className='btn btn-outline-light rounded-pill d-flex align-items-center gap-8 py-8 px-16 logout-btn'
                onClick={handleLogout}
              >
                <span className='d-none d-sm-inline'>Log Out</span>
                <i className='ph-bold ph-sign-out text-lg' />
              </button>
            </div>

            {/* White Content Card */}
            <div className='bg-white border border-neutral-30 rounded-16 p-32 shadow-sm mb-32'>
              <div className='d-flex justify-content-between align-items-center mb-24 pb-16 border-bottom'>
                <h3 className='mb-0 text-neutral-700 fw-bold'>{activeTab}</h3>
                {/* Pencil icon - not strictly needed for web but matches screenshot */}
                <div className='bg-main-600 text-white rounded-circle d-flex align-items-center justify-content-center shadow-sm' style={{ width: '36px', height: '36px' }}>
                  <i className='ph ph-pencil-simple text-lg' />
                </div>
              </div>

              {profileStatus.message ? (
                <div
                  className={`alert alert-${profileStatus.type === "success" ? "success" : "danger"} text-sm mb-24`}
                  role='alert'
                >
                  {profileStatus.message}
                </div>
              ) : null}

              {uploading && <div className='alert alert-info py-8 px-16 text-sm mb-24'>Uploading profile picture...</div>}

              <form onSubmit={handleProfileSubmit} className='row gy-4'>
                {activeTab === "Personal Info" && (
                  <>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='email'>
                        Email Id*
                      </label>
                      <input
                        type='email'
                        className='common-input rounded-12 h-56 bg-neutral-10'
                        id='email'
                        value={profileData.email}
                        disabled
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='mobile'>
                        Mobile Number*
                      </label>
                      <input
                        type='tel'
                        className='common-input rounded-12 h-56 bg-neutral-10'
                        id='phone'
                        name='phone'
                        value={profileData.phone}
                        disabled
                      />
                    </div>
                    <div className='col-sm-12'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='fullname'>
                        Full Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='fullname'
                        name='fullname'
                        value={profileData.fullname}
                        onChange={handleProfileChange}
                        placeholder='Enter your full name'
                        required
                      />
                    </div>
                    <div className='col-sm-12'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='address'>
                        Address
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='address'
                        name='personalDetails.address'
                        value={profileData.personalDetails.address}
                        onChange={handleProfileChange}
                        placeholder='Building, Street, Area'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='city'>
                        City
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='city'
                        name='personalDetails.city'
                        value={profileData.personalDetails.city}
                        onChange={handleProfileChange}
                        placeholder='Enter city'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='zipCode'>
                        Pincode
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='zipCode'
                        name='personalDetails.zipCode'
                        value={profileData.personalDetails.zipCode}
                        onChange={handleProfileChange}
                        placeholder='6-digit pincode'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='state'>
                        State
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='state'
                        name='personalDetails.state'
                        value={profileData.personalDetails.state}
                        onChange={handleProfileChange}
                        placeholder='Enter state'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='dob'>
                        Date of Birth
                      </label>
                      <input
                        type='date'
                        className='common-input rounded-12 h-56'
                        id='dob'
                        name='personalDetails.dob'
                        value={profileData.personalDetails.dob}
                        onChange={handleProfileChange}
                      />
                    </div>
                  </>
                )}

                {activeTab === "Academic Info" && (
                  <>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='passingYear'>
                        Graduation Year
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='passingYear'
                        name='educationDetails.passingYear'
                        value={profileData.educationDetails.passingYear}
                        onChange={handleProfileChange}
                        placeholder='e.g. 2024'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='fieldOfStudy'>
                        Degree
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='fieldOfStudy'
                        name='educationDetails.fieldOfStudy'
                        value={profileData.educationDetails.fieldOfStudy}
                        onChange={handleProfileChange}
                        placeholder='e.g. B.Tech CS'
                      />
                    </div>
                    <div className='col-sm-12'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='institutionName'>
                        College/University Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='institutionName'
                        name='educationDetails.institutionName'
                        value={profileData.educationDetails.institutionName}
                        onChange={handleProfileChange}
                        placeholder='Enter your college name'
                      />
                    </div>
                  </>
                )}

                {activeTab === "Job Info" && (
                  <>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='company'>
                        Company Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='company'
                        name='jobDetails.company'
                        value={profileData.jobDetails.company}
                        onChange={handleProfileChange}
                        placeholder='Enter company name'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='designation'>
                        Designation
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='designation'
                        name='jobDetails.designation'
                        value={profileData.jobDetails.designation}
                        onChange={handleProfileChange}
                        placeholder='e.g. Software Engineer'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='experienceYears'>
                        Years of Experience
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='experienceYears'
                        name='jobDetails.experienceYears'
                        value={profileData.jobDetails.experienceYears}
                        onChange={handleProfileChange}
                        placeholder='e.g. 2'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-semibold text-neutral-700 mb-8' htmlFor='linkedin'>
                        LinkedIn Link
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-12 h-56'
                        id='linkedin'
                        name='jobDetails.linkedin'
                        value={profileData.jobDetails.linkedin}
                        onChange={handleProfileChange}
                        placeholder='https://linkedin.com/in/username'
                      />
                    </div>
                  </>
                )}

                <div className='col-sm-12 pt-16'>
                  <button type='submit' className='btn btn-main rounded-pill flex-center gap-8 py-12 px-32'>
                    Save Changes
                    <i className='ph-bold ph-floppy-disk d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>



          </div>

          <div className='col-lg-4'>

            <div className='bg-white border border-neutral-30 rounded-16 p-32 shadow-sm'>
              <h4 className='mb-24 text-danger fw-bold'>Delete Account</h4>
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
                    <label className='fw-semibold text-neutral-700 mb-8' htmlFor='deleteOtp'>
                      Enter verification code
                    </label>
                    <input
                      type='text'
                      className='common-input rounded-12 text-center h-56'
                      id='deleteOtp'
                      value={deleteAccount.otp}
                      onChange={handleDeleteOtpChange}
                      placeholder='Enter OTP'
                      required
                    />
                  </div>
                  <div className='col-12 d-flex flex-column gap-12'>
                    <button
                      type='submit'
                      className='btn btn-danger rounded-pill w-100'
                      disabled={deleteAccount.loading}
                    >
                      {deleteAccount.loading ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      type='button'
                      className='btn btn-outline-neutral-300 rounded-pill w-100'
                      onClick={resetDeleteAccountState}
                      disabled={deleteAccount.loading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className='d-grid gap-24'>
                  <p className='text-neutral-700 mb-0'>
                    Permanently remove your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    type='button'
                    className='btn btn-main rounded-pill py-12'
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
