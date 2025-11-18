import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchLiveSessionByCode } from "../services/liveSessions";
import { createLiveSfuClient } from "../services/liveSfuClient";

const LiveEmbedPage = () => {
  const { code } = useParams();
  const [state, setState] = useState({ loading: true, error: null, session: null });

  const videoRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    let client = null;
    const load = async () => {
      setState({ loading: true, error: null, session: null });
      try {
        const session = await fetchLiveSessionByCode(code);
        if (!cancelled) {
          setState({ loading: false, error: null, session });
        }
        if (session?.viewerCode) {
          client = createLiveSfuClient({ role: "viewer", roomId: session.viewerCode });
          await client.connect();
          await client.consumeAll((track) => {
            if (cancelled) return;
            if (videoRef.current) {
              const stream = new MediaStream([track]);
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
            }
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error?.message || "Unable to load this live session.",
            session: null,
          });
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
      if (client) {
        client.consumers?.forEach((c) => c.close && c.close());
        client.consumerTransport?.close && client.consumerTransport.close();
        client.ws?.close();
      }
    };
  }, [code]);

  const renderState = () => {
    if (state.loading) {
      return (
        <div className='d-flex align-items-center justify-content-center h-100'>
          <div className='spinner-border text-primary' role='status'>
            <span className='visually-hidden'>Loading...</span>
          </div>
        </div>
      );
    }

    if (state.error || !state.session) {
      return (
        <div className='d-flex align-items-center justify-content-center h-100 text-center px-4'>
          <div>
            <p className='mb-2 fw-semibold'>Live session unavailable</p>
            <p className='mb-0 small text-muted'>{state.error || "Please try again later."}</p>
          </div>
        </div>
      );
    }

    return (
      <div className='d-flex align-items-center justify-content-center h-100 text-center px-4'>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          controls
          style={{ width: '100%', maxWidth: 960, maxHeight: '80vh', background: '#000' }}
        />
      </div>
    );
  };

  return (
    <div
      style={{
        margin: 0,
        padding: 0,
        width: "100vw",
        height: "100vh",
        background: "#000",
        color: "#fff",
      }}
    >
      {renderState()}
    </div>
  );
};

export default LiveEmbedPage;
