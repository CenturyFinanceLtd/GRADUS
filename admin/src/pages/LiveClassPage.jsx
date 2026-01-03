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
                    courseSlug: selectedCourse,
                    courseName: courseName,
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
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
                <div className="d-flex align-items-center gap-3">
                    <span className="w-44-px h-44-px bg-primary-100 text-primary-600 d-flex justify-content-center align-items-center rounded-circle text-2xl">
                        <i className="ri-broadcast-line" />
                    </span>
                    <div>
                        <h6 className="fw-semibold mb-0">Live Studio</h6>
                        <p className="text-secondary-light mb-0 text-sm">Manage sessions and engage with students</p>
                    </div>
                </div>
                {isConfigured && activeRoom && (
                    <span className="text-sm fw-medium text-danger-600 bg-danger-100 px-12 py-4 radius-4 d-flex align-items-center gap-2">
                        <span className="w-8-px h-8-px bg-danger-600 rounded-circle animate-pulse" />
                        Live Now
                    </span>
                )}
            </div>

            {!isConfigured && (
                <div className="alert alert-warning d-flex align-items-center p-16 mb-24 gap-2 radius-8">
                    <i className="ri-error-warning-line text-xl" />
                    <div>
                        <h6 className="fw-semibold mb-0 text-warning-600">Configuration Missing</h6>
                        <p className="text-sm mb-0">100ms credentials are missing. Please add them to your Supabase project secrets.</p>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert alert-danger d-flex align-items-center p-16 mb-24 gap-2 radius-8">
                    <i className="ri-close-circle-line text-xl" />
                    <div>
                        <h6 className="fw-semibold mb-0 text-danger-600">Error Occurred</h6>
                        <p className="text-sm mb-0">{error}</p>
                    </div>
                </div>
            )}

            {/* Main Content */}
            {!activeRoom ? (
                <div className="row gy-4">
                    <div className="col-xxl-8 col-xl-7">
                        <div className="card h-100">
                            <div className="card-body p-24 d-flex flex-column align-items-center justify-content-center text-center">
                                <div className="mb-24 p-24 bg-primary-50 rounded-circle d-inline-flex">
                                    <i className="ri-mic-2-line text-6xl text-primary-600" />
                                </div>

                                <h4 className="fw-semibold mb-8 text-neutral-800">Ready to go live?</h4>
                                <p className="text-secondary-light mb-32" style={{ maxWidth: '400px' }}>
                                    Select a course below to instantly create a secure classroom and invite your students.
                                </p>

                                <div className="w-100" style={{ maxWidth: '400px' }}>
                                    <div className="mb-16 text-start">
                                        <label className="form-label fw-semibold text-primary-light text-sm mb-8">Select Course</label>
                                        <select
                                            className="form-select form-control radius-8"
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            disabled={loadingCourses}
                                        >
                                            <option value="">Start typing or select...</option>
                                            {Array.isArray(courses) && courses.map((course) => (
                                                <option key={course.id || course.slug} value={course.id || course.slug}>
                                                    {course.name || course.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="mb-24 text-start">
                                        <label className="form-label fw-semibold text-primary-light text-sm mb-8">Role</label>
                                        <select
                                            className="form-select form-control radius-8"
                                            value={manualRole}
                                            onChange={(e) => setManualRole(e.target.value)}
                                        >
                                            <option value="auto">Auto-Detect Role (Recommended)</option>
                                            <option value="teacher">Force Role: Teacher</option>
                                            <option value="host">Force Role: Host</option>
                                            <option value="broadcaster">Force Role: Broadcaster</option>
                                        </select>
                                    </div>

                                    <button
                                        className="btn btn-primary-600 w-100 radius-8 py-12 d-flex align-items-center justify-content-center gap-2"
                                        onClick={handleStartClass}
                                        disabled={loading || !isConfigured || !selectedCourse}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" />
                                                Setting up...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-broadcast-line text-lg" />
                                                Start Streaming
                                            </>
                                        )}
                                    </button>
                                    <p className="mt-16 text-xs text-secondary-light d-flex align-items-center justify-content-center gap-1">
                                        <i className="ri-shield-check-line" />
                                        Secured by 100ms Live Infrastructure
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-xxl-4 col-xl-5">
                        <div className="card h-100">
                            <div className="card-header border-bottom bg-base py-16 px-24">
                                <h6 className="text-lg fw-semibold mb-0">Recent Sessions</h6>
                            </div>
                            <div className="card-body p-0">
                                {rooms.length === 0 ? (
                                    <div className="p-24 text-center">
                                        <div className="w-44-px h-44-px bg-base rounded-circle d-inline-flex align-items-center justify-content-center mb-12">
                                            <i className="ri-history-line text-xl text-secondary-light" />
                                        </div>
                                        <p className="text-secondary-light text-sm mb-0">No recent class history found.</p>
                                    </div>
                                ) : (
                                    <div className="d-flex flex-column">
                                        {rooms.slice(0, 5).map((room) => (
                                            <div key={room.id} className="d-flex align-items-center justify-content-between p-16 border-bottom hover-bg-base transition-2">
                                                <div className="d-flex align-items-center gap-3">
                                                    <span className={`w-40-px h-40-px rounded-circle d-flex align-items-center justify-content-center text-xl shrink-0 ${room.enabled ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-400'}`}>
                                                        <i className={`ri-video-${room.enabled ? 'chat' : 'off'}-line`} />
                                                    </span>
                                                    <div className="flex-grow-1">
                                                        <h6 className="text-sm fw-medium mb-1 text-primary-light">{room.name.split('_')[0]}</h6>
                                                        <span className="text-xs text-secondary-light">
                                                            {new Date(room.created_at || room.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`text-xs px-8 py-4 radius-4 fw-medium ${room.enabled ? 'bg-success-100 text-success-600' : 'bg-gray-100 text-gray-500'}`}>
                                                    {room.enabled ? 'Live' : 'Ended'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Live Active View
                <div className="card overflow-hidden">
                    <div className="card-header bg-white border-bottom py-16 px-24 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3">
                            <span className="bg-danger-100 text-danger-600 text-xs fw-bold px-10 py-6 radius-4 d-flex align-items-center gap-2 border border-danger-200">
                                <span className="w-8-px h-8-px bg-danger-600 rounded-circle animate-pulse" />
                                LIVE ON AIR
                            </span>
                            <div className="d-flex flex-column">
                                <h6 className="text-neutral-800 fw-bold mb-0 text-lg">
                                    {activeRoom.courseName || activeRoom.name}
                                </h6>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-16">
                            {/* Link Copy Component */}
                            <div className="d-none d-md-flex align-items-center gap-12 bg-neutral-50 px-16 py-8 radius-8 border border-neutral-200">
                                <span className="text-secondary-light text-xs fw-medium text-uppercase tracking-wider">Student Link:</span>
                                <div className="d-flex align-items-center gap-8 border-start border-neutral-300 ps-12">
                                    <span className="text-primary-600 text-sm fw-semibold text-truncate" style={{ maxWidth: '200px' }}>
                                        {getStudentJoinLink()}
                                    </span>
                                    <button
                                        className="btn btn-icon p-0 w-32-px h-32-px d-flex justify-content-center align-items-center radius-4 hover-bg-primary-50 text-primary-600 transition-2"
                                        onClick={copyJoinLink}
                                        title="Copy Link"
                                    >
                                        <i className="ri-file-copy-line text-lg" />
                                    </button>
                                </div>
                            </div>

                            <div className="w-1-px h-32-px bg-neutral-200 mx-8 d-none d-md-block"></div>

                            <button
                                className="btn btn-danger-600 radius-8 py-10 px-20 text-sm fw-semibold d-flex align-items-center gap-2 shadow-sm hover-shadow-md transition-2"
                                onClick={handleEndClass}
                            >
                                <i className="ri-stop-circle-fill text-lg" />
                                End Session
                            </button>
                        </div>
                    </div>
                    <div className="card-body p-0 bg-black" style={{ height: '75vh' }}>
                        <iframe
                            title="Live Class"
                            src={getIframeUrl()}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allow="camera; microphone; fullscreen; display-capture; autoplay; screen-wake-lock"
                        />
                    </div>
                </div>
            )}
        </MasterLayout>
    );
};

export default LiveClassPage;
