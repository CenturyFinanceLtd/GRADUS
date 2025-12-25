import "@livekit/components-styles";
import {
    LiveKitRoom,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    ControlBar,
    useTracks,
    LayoutContextProvider,
    Chat,
    useChatToggle,
    useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useEffect, useState } from "react";

export const LiveClassRoom = ({ token, serverUrl, onDisconnect, onConnected }) => {
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
                <StudentLayout />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </LayoutContextProvider>
    );
};

function StudentLayout() {
    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    const { state: chatState } = useChatToggle();
    const room = useRoomContext();

    const sendHandRaise = () => {
        const payload = JSON.stringify({ type: 'hand-raise', value: true });
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        room.localParticipant.publishData(data, { reliable: true });
        // Optional: Local feedback or toast
    };

    const sendReaction = (emoji) => {
        const payload = JSON.stringify({ type: 'reaction', value: emoji });
        const encoder = new TextEncoder();
        const data = encoder.encode(payload);
        room.localParticipant.publishData(data, { reliable: true });
    };

    return (
        <div className="lk-video-conference" style={{ height: '100%' }}>
            <div className="lk-video-conference-inner" style={{ display: 'flex', height: 'calc(100% - var(--lk-control-bar-height))' }}>
                <div className="lk-grid-layout-wrapper" style={{ flex: 1, position: 'relative' }}>
                    <GridLayout tracks={tracks}>
                        <ParticipantTile />
                    </GridLayout>
                </div>
                {chatState && (
                    <div className="lk-chat-wrapper" style={{ width: 300, borderLeft: '1px solid #333' }}>
                        <Chat />
                    </div>
                )}
            </div>
            <ControlBar
                variation="minimal"
                controls={{ screenShare: false, chat: true, microphone: true, camera: true }}
            >
                <div className="lk-button-group">
                    <button className="lk-button" onClick={sendHandRaise} title="Raise Hand">
                        ✋
                    </button>
                    <button className="lk-button" onClick={() => sendReaction('👏')} title="Clap">
                        👏
                    </button>
                    <button className="lk-button" onClick={() => sendReaction('👍')} title="Thumbs Up">
                        👍
                    </button>
                    <button className="lk-button" onClick={() => sendReaction('❤️')} title="Love">
                        ❤️
                    </button>
                </div>
            </ControlBar>
        </div>
    );
}
