/**
 * 100ms Prebuilt Instructor Room Component
 * Uses HMSPrebuilt for teachers to conduct live classes
 */
import { HMSPrebuilt } from '@100mslive/roomkit-react';
import './live.css';

/**
 * Prebuilt Instructor Room
 * @param {Object} props
 * @param {string} props.roomCode - 100ms room code for joining as instructor
 * @param {string} props.userName - Display name for the instructor
 * @param {function} props.onLeave - Callback when instructor leaves the room
 */
export default function PrebuiltInstructorRoom({ roomCode, userName, onLeave }) {
    if (!roomCode) {
        return (
            <div className="error-screen">
                <div className="error-message">
                    <h3>Unable to Start Live Class</h3>
                    <p>No room code provided</p>
                    <button className="btn btn-primary" onClick={onLeave}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="prebuilt-instructor-container">
            <HMSPrebuilt
                roomCode={roomCode}
                options={{
                    userName: userName || 'Instructor',
                }}
                onLeave={onLeave}
            />
        </div>
    );
}
