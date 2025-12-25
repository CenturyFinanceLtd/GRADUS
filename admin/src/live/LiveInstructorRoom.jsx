import "@livekit/components-styles";
import {
    LiveKitRoom,
    VideoConference,
    RoomAudioRenderer,
    LayoutContextProvider,
} from "@livekit/components-react";
import { useEffect, useState } from "react";

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
                <VideoConference chat={true} />
                <RoomAudioRenderer />
            </LiveKitRoom>
        </LayoutContextProvider>
    );
};
