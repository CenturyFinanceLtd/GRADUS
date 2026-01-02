import { useState, useEffect } from 'react';
import MasterLayout from '../masterLayout/MasterLayout';
import useAuth from '../hook/useAuth';
import apiClient from '../services/apiClient';
import { SUPABASE_FUNCTIONS_URL, SUPABASE_ANON_KEY, HMS_SYSTEM_SUBDOMAIN } from '../config/env';

const LIVE_CLASS_API_URL = SUPABASE_FUNCTIONS_URL ? `${SUPABASE_FUNCTIONS_URL}/live-class-api` : null;

const LiveClassPage = () => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeRoom, setActiveRoom] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [error, setError] = useState('');
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [loadingCourses, setLoadingCourses] = useState(true);
    // Manual Role Selector State
    const [manualRole, setManualRole] = useState('auto');

    // Check if 100ms is configured
    const isConfigured = !!LIVE_CLASS_API_URL;

    // Fetch courses and active rooms on mount
    useEffect(() => {
        fetchCourses();
        if (isConfigured) {
            fetchRooms();
        }
    }, [isConfigured]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            const data = await apiClient('/admin/courses', { token });
            let courseList = [];
            if (Array.isArray(data)) {
                courseList = data;
            } else if (data && typeof data === 'object') {
                courseList = data.items || data.courses || data.data || [];
            }
            setCourses(courseList);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
            setCourses([]);
        } finally {
            setLoadingCourses(false);
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch(`${LIVE_CLASS_API_URL}/rooms`, {
                headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            });
            const data = await res.json();
            if (data.success) {
                setRooms(data.rooms || []);
            }
        } catch (err) {
            console.error('Failed to fetch rooms:', err);
        }
    };

    const handleStartClass = async () => {
        if (!selectedCourse) {
            setError('Please select a course to start the session.');
            return;
        }

        const course = courses.find(c => (c.id === selectedCourse || c.course_key === selectedCourse || c.slug === selectedCourse));
        const rawCourseName = course?.title || course?.name || 'Live Class';
        const courseName = rawCourseName.replace(/[^a-zA-Z0-9 ]/g, '');

        setLoading(true);
        setError('');

        try {
            // Room Name strict sanitization
            const safeName = rawCourseName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const timestamp = new Date().toISOString().replace(/[^a-zA-Z0-9.\-_]/g, '_');
            const roomName = `${safeName}_${timestamp}`.substring(0, 60);

            // 1. Create 100ms Room
            const createRes = await fetch(`${LIVE_CLASS_API_URL}/create-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                    name: roomName,
                    description: `Live class for ${courseName}`,
                }),
            });

            const createData = await createRes.json();
            console.log("Room Created Response:", createData);

            if (!createData.success) {
                throw new Error(createData.error || 'Failed to create room_');
            }

            // 2. Determine Role
            const codes = createData.room.codes || {};
            const availableRoles = Object.keys(codes);
            console.log("Available Roles in Template:", availableRoles);

            let finalRole = 'teacher';

            if (manualRole !== 'auto') {
                finalRole = manualRole;
            } else {
                finalRole = availableRoles.find(r =>
                    ['broadcaster', 'teacher', 'instructor', 'host', 'presenter', 'moderator'].includes(r.toLowerCase())
                ) || 'teacher';
            }
            console.log("Validation Role Selected:", finalRole);

            // 3. Get Codes
            const hostCode = codes[finalRole] || codes.host;
            const guestCode = codes.student || codes.guest || codes.viewer;

            let token = null;

            // 4. Auth Strategy: Prefer Room Code
            // Only generate token if NO CODE is available. 
            // This prevents "400 Bad Request" if the backend JWT signing keys are invalid.
            if (!hostCode) {
                console.log("No Room Code found. Attempting Token Generation...");
                try {
                    const tokenRes = await fetch(`${LIVE_CLASS_API_URL}/get-token`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                            roomId: createData.room.id,
                            userId: `instructor-${Date.now()}`,
                            role: finalRole,
                        }),
                    });
                    const tokenData = await tokenRes.json();
                    if (tokenData.success) {
                        token = tokenData.token;
                    } else {
                        console.warn(`Token failed for role '${finalRole}'.`);
                    }
                } catch (err) {
                    console.warn("Token API failed.", err);
                }
            } else {
                console.log("Using Room Code for Auth (Preferred). Skipping Token.");
            }

            // Verify we have at least one way to join
            if (!token && !hostCode) {
                throw new Error(`Failed to join: Role '${finalRole}' has no Room Code and Token generation failed.`);
            }

            setActiveRoom({
                ...createData.room,
                token: token,
                hostCode: hostCode,
                guestCode: guestCode,
                instructorRole: finalRole,
                courseName: courseName,
            });

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEndClass = async () => {
        if (!activeRoom) return;
        try {
            await fetch(`${LIVE_CLASS_API_URL}/end-room/${activeRoom.id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
            });
            setActiveRoom(null);
            fetchRooms();
        } catch (err) {
            console.error('Failed to end class:', err);
        }
    };

    const getStudentJoinLink = () => {
        if (!activeRoom) return '';

        // 1. Try to generate direct 100ms link (Preferred by user)
        // Format: https://<custom-domain>/meeting/<guest-code>
        const domainConfig = HMS_SYSTEM_SUBDOMAIN || 'gradus.app.100ms.live';
        const fullDomain = domainConfig.includes('.') ? domainConfig : `${domainConfig}.app.100ms.live`;

        if (activeRoom.guestCode) {
            return `https://${fullDomain}/meeting/${activeRoom.guestCode}`;
        }

        // 2. Fallback to internal frontend link
        const baseUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin.replace(':5174', ':5173');
        return `${baseUrl}/join-class/${activeRoom.id}`;
    };

    const copyJoinLink = () => {
        navigator.clipboard.writeText(getStudentJoinLink());
    };

    const getIframeUrl = () => {
        if (!activeRoom) return '';
        const domainConfig = HMS_SYSTEM_SUBDOMAIN || 'gradus.app.100ms.live';
        const fullDomain = domainConfig.includes('.') ? domainConfig : `${domainConfig}.app.100ms.live`;

        // PRIORITY: Use Room Code if available (safest standard method)
        if (activeRoom.hostCode) {
            return `https://${fullDomain}/meeting/${activeRoom.hostCode}`;
        }

        // Fallback: Use Token
        if (activeRoom.token) {
            return `https://${fullDomain}/meeting/${activeRoom.id}?token=${activeRoom.token}`;
        }

        return '';
    };

    return (
        <MasterLayout>
            <div className="container-fluid" style={{ minHeight: '100vh', background: '#f8f9fa', padding: '1.5rem 2rem' }}>
                {/* Header */}
                <div className="row mb-5">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <div className="icon-wrapper shadow-sm bg-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '50px', height: '50px' }}>
                                    <i className="ri-broadcast-fill text-danger fs-4"></i>
                                </div>
                                <div>
                                    <h3 className="fw-bold text-dark mb-0">Live Studio</h3>
                                    <small className="text-muted">Manage your live sessions and engage with students.</small>
                                </div>
                            </div>
                            {isConfigured && activeRoom && (
                                <span className="badge bg-danger bg-opacity-10 text-danger px-3 py-2 rounded-pill d-flex align-items-center">
                                    <span className="spinner-grow spinner-grow-sm me-2" role="status" aria-hidden="true"></span>
                                    Live Now
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!isConfigured && (
                    <div className="alert alert-warning border-0 shadow-sm mb-4 rounded-3 d-flex align-items-center p-3">
                        <i className="ri-error-warning-line fs-4 me-3 text-warning"></i>
                        <div>
                            <h6 className="fw-bold mb-1">Configuration Missing</h6>
                            <p className="mb-0 small text-muted">100ms credentials are missing. Please add them to your Supabase project secrets to enable live classes.</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="alert alert-danger border-0 shadow-sm mb-4 rounded-3 d-flex align-items-center p-3 animate__animated animate__fadeIn">
                        <i className="ri-close-circle-fill fs-4 me-3 text-danger"></i>
                        <div>
                            <h6 className="fw-bold mb-1">Error Occurred</h6>
                            <p className="mb-0 small">{error}</p>
                        </div>
                    </div>
                )}

                {!activeRoom ? (
                    <div className="row g-4">
                        {/* Interactive Card */}
                        <div className="col-lg-7 col-xl-8">
                            <div className="card border-0 shadow-lg h-100 position-relative overflow-hidden" style={{ borderRadius: '24px', background: 'linear-gradient(145deg, #ffffff 0%, #fefefe 100%)' }}>
                                <div className="card-body p-5 d-flex flex-column align-items-center justify-content-center text-center">
                                    <div className="mb-4 position-relative">
                                        <div className="position-absolute top-50 start-50 translate-middle" style={{ width: '120px', height: '120px', background: 'radial-gradient(circle, rgba(220, 53, 69, 0.1) 0%, rgba(255,255,255,0) 70%)', zIndex: 0 }}></div>
                                        <i className="ri-mic-2-line position-relative" style={{ fontSize: '64px', color: '#dc3545', zIndex: 1, textShadow: '0 4px 12px rgba(220, 53, 69, 0.2)' }}></i>
                                    </div>

                                    <h2 className="fw-bold mb-2 text-dark">Ready to go live?</h2>
                                    <p className="text-muted mb-5 text-center" style={{ maxWidth: '450px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                        Select a course below to instantly create a secure classroom and invite your students.
                                    </p>

                                    <div className="w-100" style={{ maxWidth: '420px' }}>
                                        <div className="form-floating mb-3 shadow-sm rounded-3">
                                            <select
                                                className="form-select border-0 bg-light fw-medium"
                                                id="courseSelect"
                                                style={{ borderRadius: '12px', height: '60px', paddingLeft: '1.5rem' }}
                                                value={selectedCourse}
                                                onChange={(e) => setSelectedCourse(e.target.value)}
                                                disabled={loadingCourses}
                                            >
                                                <option value="">Select a Course...</option>
                                                {Array.isArray(courses) && courses.map((course) => (
                                                    <option key={course.id || course.slug} value={course.id || course.slug}>
                                                        {course.name || course.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <label htmlFor="courseSelect" className="text-muted ps-4">Course</label>
                                        </div>

                                        {/* Manual Role Selector */}
                                        <div className="form-floating mb-4 shadow-sm rounded-3">
                                            <select
                                                className="form-select border-0 bg-light fw-medium"
                                                id="roleSelect"
                                                style={{ borderRadius: '12px', height: '60px', paddingLeft: '1.5rem' }}
                                                value={manualRole}
                                                onChange={(e) => setManualRole(e.target.value)}
                                            >
                                                <option value="auto">Auto-Detect Role (Recommended)</option>
                                                <option value="teacher">Force Role: Teacher</option>
                                                <option value="host">Force Role: Host</option>
                                                <option value="broadcaster">Force Role: Broadcaster</option>
                                            </select>
                                            <label htmlFor="roleSelect" className="text-muted ps-4">Instructor Role (Template)</label>
                                        </div>

                                        <button
                                            className="btn btn-danger w-100 py-3 fw-bold d-flex align-items-center justify-content-center shadow"
                                            style={{ borderRadius: '12px', fontSize: '1.1rem', background: 'linear-gradient(90deg, #dc3545 0%, #e04b59 100%)', border: 'none', transition: 'all 0.3s ease' }}
                                            onClick={handleStartClass}
                                            disabled={loading || !isConfigured || !selectedCourse}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Setting up Room...
                                                </>
                                            ) : (
                                                <><i className="ri-broadcast-line me-2"></i> Start Streaming</>
                                            )}
                                        </button>
                                        <div className="mt-3">
                                            <small className="text-muted opacity-75">
                                                <i className="ri-shield-check-line me-1 align-bottom"></i>
                                                Secured by 100ms Live Infrastructure
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar: History & Tips */}
                        <div className="col-lg-5 col-xl-4">
                            {/* Tips Card */}
                            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px', background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', color: 'white' }}>
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="p-2 bg-white bg-opacity-25 rounded-3 me-3">
                                            <i className="ri-lightbulb-flash-line fs-4 text-white"></i>
                                        </div>
                                        <div>
                                            <h5 className="fw-bold mb-1">Pro Tips</h5>
                                            <p className="mb-0 small text-white-50">Optimize your streaming experience</p>
                                        </div>
                                    </div>
                                    <ul className="mb-0 ps-3 small text-white-50" style={{ listStyleType: 'circle' }}>
                                        <li className="mb-2">Ensure your webcam permissions are enabled.</li>
                                        <li className="mb-2">Use a wired connection for best stability.</li>
                                        <li>If the screen is blank, verify the <code>VITE_HMS_SYSTEM_SUBDOMAIN</code> in your environment config.</li>
                                        <li>Try changing "Role" if you get a 400 error.</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Recent Sessions */}
                            <div className="card border-0 shadow-sm" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                                <div className="card-header bg-white border-bottom border-light p-4 d-flex justify-content-between align-items-center">
                                    <h6 className="fw-bold mb-0 text-dark">Recent Sessions</h6>
                                    <button className="btn btn-sm btn-light text-primary rounded-pill px-3 fw-medium" onClick={fetchRooms}>
                                        <i className="ri-refresh-line me-1"></i> Refresh
                                    </button>
                                </div>
                                <div className="card-body p-0">
                                    {rooms.length === 0 ? (
                                        <div className="p-5 text-center">
                                            <div className="mb-3 text-muted opacity-25">
                                                <i className="ri-history-line display-4"></i>
                                            </div>
                                            <p className="text-muted small mb-0">No recent class history found.</p>
                                        </div>
                                    ) : (
                                        <div className="list-group list-group-flush">
                                            {rooms.slice(0, 5).map((room, idx) => (
                                                <div key={room.id} className={`list-group-item p-3 border-light ${idx % 2 === 0 ? 'bg-light bg-opacity-10' : ''}`}>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex align-items-center overflow-hidden">
                                                            <div className={`rounded-circle p-2 me-3 flex-shrink-0 ${room.enabled ? 'bg-success bg-opacity-10' : 'bg-secondary bg-opacity-10'}`}>
                                                                <i className={`ri-video-${room.enabled ? 'chat' : 'off'}-line ${room.enabled ? 'text-success' : 'text-secondary'}`}></i>
                                                            </div>
                                                            <div className="text-truncate">
                                                                <h6 className="mb-0 text-dark small fw-semibold text-truncate" style={{ maxWidth: '180px' }}>{room.name.replace(/_/g, ' ')}</h6>
                                                                <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                    {new Date(room.created_at || room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </small>
                                                            </div>
                                                        </div>
                                                        <span className={`badge rounded-pill ${room.enabled ? 'bg-success text-white' : 'bg-light text-secondary border'}`} style={{ fontSize: '0.7rem' }}>
                                                            {room.enabled ? 'Live' : 'Ended'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="row animate__animated animate__fadeInUp">
                        <div className="col-12">
                            <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: '24px' }}>
                                <div className="card-header bg-dark p-3 px-4 d-flex justify-content-between align-items-center border-0">
                                    <div className="d-flex align-items-center">
                                        <div className="d-flex align-items-center bg-danger rounded px-2 py-1 me-3">
                                            <div className="spinner-grow spinner-grow-sm text-white me-2" style={{ width: '0.5rem', height: '0.5rem' }} role="status"></div>
                                            <span className="text-white fw-bold small text-uppercase" style={{ letterSpacing: '1px' }}>Live</span>
                                        </div>
                                        <h6 className="text-white-50 mb-0 fw-normal border-start border-secondary ps-3 ms-1 d-none d-md-block">
                                            {activeRoom.courseName || activeRoom.name}
                                        </h6>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <div className="input-group input-group-sm me-3 bg-secondary bg-opacity-25 rounded px-2 py-1 d-none d-md-flex" style={{ maxWidth: '300px' }}>
                                            <span className="text-white-50 small me-2 mt-1">Student Link:</span>
                                            <input type="text" className="bg-transparent border-0 text-white small fw-mono" value={getStudentJoinLink()} readOnly style={{ outline: 'none', width: '220px' }} />
                                            <button className="btn btn-link p-0 text-warning" onClick={copyJoinLink}>
                                                <i className="ri-file-copy-line"></i>
                                            </button>
                                        </div>
                                        <button className="btn btn-danger btn-sm px-4 fw-bold shadow-sm" style={{ borderRadius: '8px' }} onClick={handleEndClass}>
                                            <i className="ri-stop-circle-fill me-2"></i> End Session
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body p-0 position-relative bg-black" style={{ height: '80vh' }}>
                                    <iframe
                                        title="Live Class"
                                        src={getIframeUrl()}
                                        style={{ width: '100%', height: '100%', border: 'none' }}
                                        allow="camera; microphone; fullscreen; display-capture; autoplay; screen-wake-lock"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MasterLayout>
    );
};

export default LiveClassPage;
