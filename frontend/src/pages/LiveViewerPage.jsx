import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import HeaderOne from "../components/HeaderOne";
import FooterOne from "../components/FooterOne";
import Animation from "../helper/Animation";
import Preloader from "../helper/Preloader";
import { fetchLiveSessionByCode } from "../services/liveSessions";

const LiveViewerPage = () => {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, error: null, session: null });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setState({ loading: true, error: null, session: null });
      try {
        const session = await fetchLiveSessionByCode(code);
        if (!cancelled) {
          setState({ loading: false, error: null, session });
        }
      } catch (error) {
        if (!cancelled) {
          const message = error?.message || "Unable to load this live session.";
          setState({ loading: false, error: message, session: null });
        }
      }
    };
    if (code) {
      load();
    } else {
      setState({ loading: false, error: "Missing live session code.", session: null });
    }
    return () => {
      cancelled = true;
    };
  }, [code]);

  const headerTitle = useMemo(() => {
    if (state.session?.title) return state.session.title;
    if (state.session?.courseTitle) return `${state.session.courseTitle} - Live class`;
    return "Live class";
  }, [state.session]);

  return (
    <>
      <Preloader />
      <Animation />
      <HeaderOne />
      <section className='py-40'>
        <div className='container'>
          <div className='mb-20'>
            <Link to='/' className='btn btn-sm btn-outline-primary rounded-pill'>
              <i className='ph-bold ph-arrow-left me-2' /> Back to home
            </Link>
          </div>
          <div className='card shadow-sm'>
            <div className='card-body'>
              <div className='d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3'>
                <div>
                  <p className='text-main-600 fw-semibold mb-4'>Live session</p>
                  <h3 className='mb-0'>{headerTitle}</h3>
                  {state.session?.courseTitle ? (
                    <p className='text-neutral-600 mb-0 small'>{state.session.courseTitle}</p>
                  ) : null}
                </div>
                <span className='badge bg-danger text-white'>Live</span>
              </div>

              {state.loading ? (
                <div className='text-center py-40'>
                  <div className='spinner-border text-primary' role='status'>
                    <span className='visually-hidden'>Loading...</span>
                  </div>
                </div>
              ) : state.error ? (
                <div className='alert alert-danger mb-0'>{state.error}</div>
              ) : (
                <div className='live-viewer-embed bg-black text-white rounded position-relative overflow-hidden' style={{ minHeight: 360 }}>
                  <div className='position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center flex-column gap-2 p-3'>
                    <i className='ph-bold ph-broadcast text-primary fs-24' />
                    <p className='mb-1 text-center fw-semibold'>The instructor is live.</p>
                    <p className='mb-0 text-center text-muted small'>
                      This space renders the browser-based stream from the host. If you cannot see video, refresh or try another browser.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <FooterOne />
    </>
  );
};

export default LiveViewerPage;

