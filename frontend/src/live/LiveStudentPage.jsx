import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb";
import FooterOne from "../components/FooterOne";
import HeaderOne from "../components/HeaderOne";
import Preloader from "../helper/Preloader";
import useLiveStudentSession from "./useLiveStudentSession";
import { LiveClassRoom } from "./LiveClassRoom";
import "./live.css";

const LiveStudentPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const {
    session,
    loading,
    stageStatus,
    stageError,
    joinClass,
    user,
  } = useLiveStudentSession(sessionId);

  const [token, setToken] = useState(null);
  const [liveKitUrl, setLiveKitUrl] = useState(null);
  const [passcode, setPasscode] = useState("");
  const [joined, setJoined] = useState(false);

  const startClass = async () => {
    const displayName =
      user?.personalDetails?.studentName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.email;

    const result = await joinClass({ displayName, passcode });
    if (result && result.signaling && result.signaling.liveKitToken) {
      setToken(result.signaling.liveKitToken);
      setLiveKitUrl(result.signaling.liveKitUrl);
      setJoined(true);
    }
  };

  const handleDisconnect = useCallback(() => {
    setJoined(false);
    navigate('/');
  }, [navigate]);

  return (
    <>
      <Preloader />
      <HeaderOne />
      <Breadcrumb title={"Live Classroom"} />

      <section className='live-student-section section-padding'>
        <div className='container'>
          {loading ? (
            <div className='text-center text-muted py-5'>Loading class details...</div>
          ) : !joined ? (
            <div className="card mx-auto" style={{ maxWidth: 500 }}>
              <div className="card-body p-4 text-center">
                <h2>{session?.courseName || "Live Class"}</h2>
                <p className="text-muted">{session?.title}</p>

                {stageError && <div className="alert alert-danger">{stageError}</div>}

                {session?.requiresPasscode && (
                  <div className='mb-3 text-start'>
                    <label className='form-label'>Passcode</label>
                    <input
                      type='text'
                      className='form-control'
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                    />
                  </div>
                )}

                <button className="btn btn-primary w-100" onClick={startClass} disabled={stageStatus === 'joining'}>
                  {stageStatus === 'joining' ? 'Joining...' : 'Join Class'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ height: '80vh', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
              <LiveClassRoom
                token={token}
                serverUrl={liveKitUrl}
                onDisconnect={handleDisconnect}
              />
            </div>
          )}
        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default LiveStudentPage;
