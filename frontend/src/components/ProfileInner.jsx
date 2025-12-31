import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../services/apiClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../services/supabaseClient";

const safeString = (value) => (typeof value === "string" ? value : "");

const mapUserToProfileState = (user) => ({
  fullname: safeString(user?.fullname),
  mobile: safeString(user?.mobile),
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
        mobile: profileData.mobile.trim(),
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
      const fileExt = file.name.split(".").pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `profiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile_image")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("profile_image")
        .getPublicUrl(filePath);

      setProfileData((prev) => ({ ...prev, profileImageUrl: publicUrl }));

      // Also update directly in backend for persistence
      await apiClient.put("/users/me", { profileImageUrl: publicUrl }, { token });

      setProfileStatus({ type: "success", message: "Profile picture updated!" });
    } catch (error) {
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
              <div className='d-flex justify-content-between align-items-center mb-32'>
                <h3 className='mb-0 text-neutral-500'>Account Details</h3>
                <button
                  type='button'
                  className='btn btn-outline-danger rounded-pill d-inline-flex align-items-center gap-8'
                  onClick={handleLogout}
                >
                  Log Out
                  <i className='ph-bold ph-sign-out d-flex text-lg' />
                </button>
              </div>

              {/* Profile Image Section */}
              <div className='text-center mb-32'>
                <div className='position-relative d-inline-block'>
                  <div
                    className='rounded-circle bg-neutral-20 border border-neutral-30 overflow-hidden d-flex align-items-center justify-content-center'
                    style={{ width: '120px', height: '120px' }}
                  >
                    {profileData.profileImageUrl ? (
                      <img
                        src={profileData.profileImageUrl}
                        alt='Profile'
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <i className='ph ph-user text-neutral-300' style={{ fontSize: '64px' }} />
                    )}
                  </div>
                  <label
                    htmlFor='profile-pic-upload'
                    className='position-absolute bottom-0 end-0 bg-main text-white rounded-circle d-flex align-items-center justify-content-center cursor-pointer border border-white'
                    style={{ width: '36px', height: '36px', transform: 'translate(10%, 10%)' }}
                  >
                    <i className='ph ph-camera text-lg' />
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
                {uploading && <div className='text-sm mt-8 text-main'>Uploading...</div>}
              </div>

              {/* Tabs navigation */}
              <div className='d-flex gap-24 mb-32 border-bottom'>
                {["Personal Info", "Academic Info", "Job Info"].map((tab) => (
                  <button
                    key={tab}
                    type='button'
                    className={`pb-12 text-lg fw-medium position-relative transition-all ${activeTab === tab ? "text-main" : "text-neutral-400"}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                    {activeTab === tab && (
                      <div className='position-absolute bottom-0 start-0 w-100 bg-main' style={{ height: '3px', borderRadius: '3px 3px 0 0' }} />
                    )}
                  </button>
                ))}
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
                {activeTab === "Personal Info" && (
                  <>
                    <div className='col-sm-12'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='fullname'>
                        Full Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='fullname'
                        name='fullname'
                        value={profileData.fullname}
                        onChange={handleProfileChange}
                        placeholder='Enter your full name'
                        required
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='email'>
                        Email Address
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
                        className='common-input rounded-pill bg-neutral-20'
                        id='mobile'
                        value={profileData.mobile}
                        disabled
                      />
                    </div>
                    <div className='col-sm-12'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='address'>
                        Address
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='address'
                        name='personalDetails.address'
                        value={profileData.personalDetails.address}
                        onChange={handleProfileChange}
                        placeholder='Building, Street, Area'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='city'>
                        City
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='city'
                        name='personalDetails.city'
                        value={profileData.personalDetails.city}
                        onChange={handleProfileChange}
                        placeholder='Enter city'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='zipCode'>
                        Pincode
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='zipCode'
                        name='personalDetails.zipCode'
                        value={profileData.personalDetails.zipCode}
                        onChange={handleProfileChange}
                        placeholder='6-digit pincode'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='state'>
                        State
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='state'
                        name='personalDetails.state'
                        value={profileData.personalDetails.state}
                        onChange={handleProfileChange}
                        placeholder='Enter state'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='dob'>
                        Date of Birth
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='dob'
                        name='personalDetails.dob'
                        value={profileData.personalDetails.dob}
                        onChange={handleProfileChange}
                        placeholder='DD/MM/YYYY'
                      />
                    </div>
                  </>
                )}

                {activeTab === "Academic Info" && (
                  <>
                    <div className='col-sm-12'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='institutionName'>
                        College/University Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='institutionName'
                        name='educationDetails.institutionName'
                        value={profileData.educationDetails.institutionName}
                        onChange={handleProfileChange}
                        placeholder='Enter your college name'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='fieldOfStudy'>
                        Degree / Course
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='fieldOfStudy'
                        name='educationDetails.fieldOfStudy'
                        value={profileData.educationDetails.fieldOfStudy}
                        onChange={handleProfileChange}
                        placeholder='e.g. B.Tech CS'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='passingYear'>
                        Graduation Year
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='passingYear'
                        name='educationDetails.passingYear'
                        value={profileData.educationDetails.passingYear}
                        onChange={handleProfileChange}
                        placeholder='e.g. 2024'
                      />
                    </div>
                  </>
                )}

                {activeTab === "Job Info" && (
                  <>
                    <div className='col-sm-12'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='company'>
                        Company Name
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='company'
                        name='jobDetails.company'
                        value={profileData.jobDetails.company}
                        onChange={handleProfileChange}
                        placeholder='Enter company name'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='designation'>
                        Designation
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='designation'
                        name='jobDetails.designation'
                        value={profileData.jobDetails.designation}
                        onChange={handleProfileChange}
                        placeholder='e.g. Software Engineer'
                      />
                    </div>
                    <div className='col-sm-6'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='experienceYears'>
                        Years of Experience
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='experienceYears'
                        name='jobDetails.experienceYears'
                        value={profileData.jobDetails.experienceYears}
                        onChange={handleProfileChange}
                        placeholder='e.g. 2'
                      />
                    </div>
                    <div className='col-sm-12'>
                      <label className='fw-medium text-lg text-neutral-500 mb-16' htmlFor='linkedin'>
                        LinkedIn Profile Link
                      </label>
                      <input
                        type='text'
                        className='common-input rounded-pill'
                        id='linkedin'
                        name='jobDetails.linkedin'
                        value={profileData.jobDetails.linkedin}
                        onChange={handleProfileChange}
                        placeholder='https://linkedin.com/in/username'
                      />
                    </div>
                  </>
                )}

                <div className='col-sm-12 pt-24'>
                  <button type='submit' className='btn btn-main rounded-pill flex-center gap-8'>
                    Save Changes
                    <i className='ph-bold ph-floppy-disk d-flex text-lg' />
                  </button>
                </div>
              </form>
            </div>


          </div>

          <div className='col-lg-4'>

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
