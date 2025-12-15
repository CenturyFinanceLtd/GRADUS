import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from "react-native-webrtc";
import { API_BASE_URL } from "@/constants/config";
import { getAuthSession } from "@/utils/auth-storage";
import { fetchLiveSession, fetchLiveChatMessages, joinLiveSession } from "@/services/liveApi";

const getWebSocketUrl = (path: string, sessionId: string, participantId: string, key: string) => {
  const wsProtocol = API_BASE_URL.startsWith("https") ? "wss" : "ws";
  const host = API_BASE_URL.replace(/^https?:\/\//, "").replace(/\/$/, ""); 
  
  let normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  // FIX: Production Nginx likely routes only /api to the backend.
  // If the server says "/live-signaling" but we are on "api.gradusindia.in", force "/api/live-signaling".
  if (host.includes("gradusindia.in") && !normalizedPath.startsWith("/api")) {
      normalizedPath = `/api${normalizedPath}`;
  }
  
  const search = new URLSearchParams({
    sessionId,
    participantId,
    key,
  }).toString();
  
  return `${wsProtocol}://${host}${normalizedPath}?${search}`;
};

export const useLiveStudentSession = (sessionId: string) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stageStatus, setStageStatus] = useState("idle");
  const [stageError, setStageError] = useState<string | null>(null);
  const [endedNoticeVisible, setEndedNoticeVisible] = useState(false);
  const [instructorStream, setInstructorStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  const participantRef = useRef<any>(null);
  const hostParticipantRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const signalingRef = useRef<{ socket: WebSocket | null; iceServers: any[] }>({
    socket: null,
    iceServers: [],
  });
  const sessionSnapshotRef = useRef<any>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidate[]>([]);

  // Token is async in RN
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    getAuthSession().then((s) => setToken(s.token));
  }, []);

  const addChatMessage = useCallback((msg: any) => {
    setChatMessages((prev) => [...prev, msg].slice(-200));
  }, []);

  useEffect(() => {
    if (!sessionId || !token) return;
    fetchLiveChatMessages(sessionId, 200)
      .then((resp) => {
        if (Array.isArray(resp?.messages)) setChatMessages(resp.messages);
      })
      .catch(() => {});
  }, [sessionId, token]);

  const loadSession = useCallback(async () => {
    if (!sessionId || !token) return;
    setLoading(true);
    setStageError(null);
    try {
      const response = await fetchLiveSession(sessionId);
      const sessionData = response?.session || null;
      setSession(sessionData);
      sessionSnapshotRef.current = sessionData;

      if (sessionData?.status === "ended") {
        setStageStatus("ended");
        setEndedNoticeVisible(true);
      }
    } catch (error: any) {
      setStageError(error?.message || "Unable to load class details.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, token]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const ensureCameraStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true, 
      });
      
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("getUserMedia failed", err);
      return null; // Don't crash
    }
  }, []);

  const sendSignal = useCallback((message: any) => {
    const socket = signalingRef.current.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, []);

  const createPeerConnection = useCallback(
    (hostId: string) => {
      const configuration = {
        iceServers: signalingRef.current.iceServers || [],
      };
      const pc = new RTCPeerConnection(configuration);

      if (localStreamRef.current) {
         localStreamRef.current.getTracks().forEach((track) => {
             pc.addTrack(track, localStreamRef.current!);
         });
      }

      // Force video transceiver to ensure we accept video
      pc.addTransceiver('video', { direction: 'sendrecv' });
      pc.addTransceiver('audio', { direction: 'sendrecv' });

      (pc as any).onicecandidate = (event: any) => {
        if (event.candidate) {
          sendSignal({
            type: "webrtc-ice-candidate",
            target: hostId,
            data: event.candidate,
          });
        }
      };

      (pc as any).ontrack = (event: any) => {
        console.log("ontrack event:", event.streams?.length, "streams", "track:", event.track?.kind);
        
        // Strategy: We want to collect ALL tracks (audio + video) into our instructorStream state.
        // Even if the event provides a stream, it might be the same reference. 
        // To be safe, we will grab all tracks from the event stream or the individual track 
        // and merge them with any existing tracks we already have, creating a NEW MediaStream object.
        // This forces React to re-render.

        const incomingTrack = event.track;
        const incomingStream = event.streams && event.streams[0];
        
        setInstructorStream((prevStream) => {
             let tracks: any[] = [];
             
             // 1. Keep valid existing tracks
             if (prevStream) {
                 tracks = [...prevStream.getTracks()];
             }
             
             // 2. Add incoming track
             if (incomingTrack && !tracks.some(t => t.id === incomingTrack.id)) {
                 tracks.push(incomingTrack);
             }
             
             // 3. Add tracks from incoming stream if any we missed
             if (incomingStream) {
                 incomingStream.getTracks().forEach((t: any) => {
                     if (!tracks.some(existing => existing.id === t.id)) {
                         tracks.push(t);
                     }
                 });
             }

             console.log("Updated Instructor Stream Tracks:", tracks.map(t => t.kind));
             return new MediaStream(tracks);
        });
      };

      // Fallback for older RNWebRTC versions just to be safe
      (pc as any).onaddstream = (event: any) => {
          console.log("onaddstream event:", event.stream?.id);
          if (event.stream) {
              setInstructorStream(event.stream);
          }
      };

      peerConnectionRef.current = pc;
      return pc;
    },
    [sendSignal]
  );

  const beginNegotiation = useCallback(async () => {
    const instructor = hostParticipantRef.current;
    if (!instructor?.id || !instructor.connected) return;
    if (!participantRef.current) return;
    const socket = signalingRef.current.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (peerConnectionRef.current) return;

    try {
      await ensureCameraStream();
      const pc = createPeerConnection(instructor.id);
      if (!pc) return;
      
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      
      sendSignal({
         type: "webrtc-offer",
         target: instructor.id,
         data: offer,
      });
    } catch (error) {
       console.warn("Failed to start negotiation", error);
    }
  }, [createPeerConnection, ensureCameraStream, sendSignal]);

  const handleSignalingPayload = useCallback(
    async (payload: any) => {
      if (!payload) return;

      switch (payload.type) {
        case "session:update":
          handleSessionUpdate(payload.session);
          break;
        case "webrtc-answer":
          if (peerConnectionRef.current && payload.data) {
             const pc = peerConnectionRef.current;
             if (pc.signalingState === 'stable') {
                 console.log("Ignoring webrtc-answer because signalingState is already stable.");
                 break; // Already connected, ignore duplicate answer
             }
             try {
                await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
             } catch (err) {
                console.warn("Failed to set remote answer", err);
             }
          }
          break;
        case "webrtc-offer":
          if (payload.data && payload.from) {
             await ensureCameraStream();
             let pc = peerConnectionRef.current;
             if (!pc) pc = createPeerConnection(payload.from);
             await pc.setRemoteDescription(new RTCSessionDescription(payload.data));
             const answer = await pc.createAnswer();
             await pc.setLocalDescription(answer);
             
             if (pendingIceCandidatesRef.current.length) {
                 for (const ice of pendingIceCandidatesRef.current) {
                     await pc.addIceCandidate(ice);
                 }
                 pendingIceCandidatesRef.current = [];
             }
             
             sendSignal({
                 type: "webrtc-answer",
                 target: payload.from,
                 data: answer,
             });
          }
          break;
        case "webrtc-ice-candidate":
          if (payload.data && peerConnectionRef.current) {
             const pc = peerConnectionRef.current;
             const candidate = new RTCIceCandidate(payload.data);
             if (pc.remoteDescription) {
                 pc.addIceCandidate(candidate);
             } else {
                 pendingIceCandidatesRef.current.push(candidate);
             }
          }
          break;
        case "chat:message":
          addChatMessage({
            from: payload.from,
            displayName: payload.displayName || "Participant",
            text: payload.text || payload.data?.text || "",
            timestamp: payload.timestamp || Date.now(),
          });
          break;
        case "kick":
           setStageError("You have been removed from the class.");
           disconnectSignaling(); 
           break;
      }
    },
    [sendSignal, ensureCameraStream, createPeerConnection] 
  );
  
   const handleSessionUpdate = async (sessionPayload: any) => {
      if (!sessionPayload) return;
      if (sessionPayload.status === "ended") {
          setStageStatus("ended");
          setEndedNoticeVisible(true);
          return;
      }
      
      sessionSnapshotRef.current = sessionPayload;
      setSession(sessionPayload);
      
      const instructorList = Array.isArray(sessionPayload.participants) ? sessionPayload.participants : [];
      const connectedInstructor = instructorList.find((p:any) => p.role === "instructor" && p.connected);
      hostParticipantRef.current = connectedInstructor || null;
      participantRef.current = sessionPayload.participants?.find((p:any) => p.id === participantRef.current?.id) || participantRef.current;
      
      if (!connectedInstructor && peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
          setInstructorStream(null);
      }
      
      if (connectedInstructor) {
         beginNegotiation();
      }
   };

  // ... inside hook

  const retryCount = useRef(0);
  const maxRetries = 3;

  const connectSignaling = useCallback(
    (signaling: any, participant: any) => {
      if (!signaling?.path || !signaling?.key || !participant?.id) {
          Alert.alert("Error", "Invalid signaling configuration");
          return;
      }

      setStageStatus("connecting");
      const url = getWebSocketUrl(signaling.path, sessionId, participant.id, signaling.key);
      console.log("Connecting WebSocket:", url);

      let socket: WebSocket;
      try {
          socket = new WebSocket(url);
      } catch (e: any) {
          Alert.alert("WS Create Error", `URL: ${url}\nError: ${e.message}`);
          setStageStatus("error");
          return;
      }
      
      signalingRef.current = {
        socket,
        iceServers: signaling.iceServers || [],
      };

      socket.onopen = () => {
        console.log("WebSocket Connected");
        retryCount.current = 0; // Reset retries on success
        setStageStatus("live");
        beginNegotiation();
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleSignalingPayload(payload);
        } catch (e) {}
      };

      socket.onclose = (e) => {
         console.log("WebSocket Closed", e.code, e.reason);
         if (stageStatus === "live" || stageStatus === "connecting") {
             if (e.code !== 1000) {
                 // Optional: Auto-reconnect on close could go here
             }
         }
         
         setStageStatus("idle");
         if (peerConnectionRef.current) {
             peerConnectionRef.current.close();
             peerConnectionRef.current = null;
         }
         setInstructorStream(null);
      };
      
      socket.onerror = (e: any) => {
         console.warn("WebSocket Error", e.message);
         if (retryCount.current < maxRetries) {
             retryCount.current += 1;
             console.log(`Retrying connection (${retryCount.current}/${maxRetries})...`);
             setTimeout(() => {
                 connectSignaling(signaling, participant);
             }, 1000);
         } else {
             const errorMsg = e.message || JSON.stringify(e);
             Alert.alert("Connection Error", `[DEBUG] Failed after ${maxRetries} retries.\n\nError: ${errorMsg}\nURL: ${url}`);
             setStageStatus("error");
         }
      };
    },
    [sessionId, beginNegotiation, handleSignalingPayload] 
  );
  
  // ...

  const joinClass = useCallback(async ({ displayName, passcode }: any) => {
      if (!token || !session) {
          Alert.alert("Error", "Missing session or token.");
          return;
      }
      
      setStageStatus("joining");
      try {
         const result = await joinLiveSession(sessionId, { displayName, passcode });
         
         const { session: joinedSession, participant, signaling } = result;
         setSession(joinedSession);
         participantRef.current = participant;
         
         if (signaling) {
             connectSignaling(signaling, participant);
         } else {
             Alert.alert("Error", "No signaling config received from server.");
             setStageStatus("idle");
         }
      } catch (err: any) {
          console.error("Join Failed", err);
          Alert.alert("Join Failed", err.message || "Could not join session.");
          setStageError(err.message);
          setStageStatus("idle");
      }
  }, [sessionId, token, session, connectSignaling]);
  
  const disconnectSignaling = () => {
      if (signalingRef.current.socket) {
          signalingRef.current.socket.close();
      }
      if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
      }
      setInstructorStream(null);
      setLocalStream(null);
  };
  
  // Cleanup
  useEffect(() => {
      return () => {
          disconnectSignaling();
          if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach(t => t.stop());
          }
      };
  }, []);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
        setIsMicOn(t.enabled);
      });
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !t.enabled;
        setIsCameraOn(t.enabled);
      });
    }
  }, []);

  return {
    session,
    loading,
    stageStatus,
    stageError,
    instructorStream,
    localStream,
    chatMessages,
    joinClass,
    leaveSession: disconnectSignaling,
    toggleMic,
    toggleCamera,
    isMicOn,
    isCameraOn,
  };
};
