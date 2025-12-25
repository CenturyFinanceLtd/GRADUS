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

    // We need a way to look at the chat toggle state.
    // The LayoutContextProvider holds this state if we use the standard hooks.
    // However, without the <VideoConference> composite, we might need to handle the layout grid vs chat side-by-side manually.
    // Simpler approach: Use the `VideoConference` component but pass a custom `ControlBar`? No, it hardcodes it.
    // Let's use a simple flex layout: Main content + Chat (if open).

    const { state: chatState } = useChatToggle();

    return (
        <div className="lk-video-conference" style={{ height: '100%' }}>
            <div className="lk-video-conference-inner" style={{ display: 'flex', height: 'calc(100% - var(--lk-control-bar-height))' }}>
                <div className="lk-grid-layout-wrapper" style={{ flex: 1 }}>
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
            />
        </div>
    );
}
