import "@livekit/components-styles";
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    LayoutContextProvider,
    useRoomContext,
} from "@livekit/components-react";
import { useEffect, useState } from "react";
import { RoomEvent } from "livekit-client";

export const LiveInstructorRoom = ({ token, serverUrl, onDisconnect, onConnected }) => {
    if (!token || !serverUrl) {
        return <div className="text-center p-5">Loading Live Class...</div>;
    }

    return (
        <LayoutContextProvider>
            <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={serverUrl}
                data-lk-theme="default"
                style={{ height: "100vh" }}
                onDisconnected={onDisconnect}
                onConnected={onConnected}
            >
                <VideoConference />
                <RoomInteractionListener />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </LayoutContextProvider>
    );
};

function RoomInteractionListener() {
    const room = useRoomContext();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!room) return;

        const handleData = (payload, participant) => {
            const decoder = new TextDecoder();
            const str = decoder.decode(payload);
            try {
                const data = JSON.parse(str);
                if (data.type === 'hand-raise') {
                    addNotification(`${participant.identity} raised hand ✋`);
                } else if (data.type === 'reaction') {
                    addNotification(`${participant.identity}: ${data.value}`);
                }
            } catch (e) {
                // ignore
            }
        };

        room.on(RoomEvent.DataReceived, handleData);
        return () => {
            room.off(RoomEvent.DataReceived, handleData);
        };
    }, [room]);

    const addNotification = (msg) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, msg }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000); // clear after 3s
    };

    if (notifications.length === 0) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
        }}>
            {notifications.map(n => (
                <div key={n.id} style={{
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: 20,
                    animation: 'fadeIn 0.3s'
                }}>
                    {n.msg}
                </div>
            ))}
        </div>
    );
}
