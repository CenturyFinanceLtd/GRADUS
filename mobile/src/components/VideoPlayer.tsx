/**
 * Video Player Component
 * Uses expo-av for video playback in lessons
 */

import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    Text,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';

interface VideoPlayerProps {
    uri: string;
    poster?: string;
    title?: string;
    onComplete?: () => void;
    onProgress?: (progress: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = (SCREEN_WIDTH * 9) / 16; // 16:9 aspect ratio

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    uri,
    poster,
    title,
    onComplete,
    onProgress,
}) => {
    const videoRef = useRef<Video>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handlePlaybackStatusUpdate = useCallback(
        (status: AVPlaybackStatus) => {
            if (!status.isLoaded) {
                if (status.error) {
                    setError('Error loading video');
                    console.error('Video error:', status.error);
                }
                return;
            }

            setIsLoading(false);
            setIsPlaying(status.isPlaying);
            setDuration(status.durationMillis || 0);

            const currentProgress = status.positionMillis / (status.durationMillis || 1);
            setProgress(currentProgress);

            if (onProgress) {
                onProgress(currentProgress * 100);
            }

            if (status.didJustFinish && onComplete) {
                onComplete();
            }
        },
        [onComplete, onProgress]
    );

    const togglePlayPause = async () => {
        if (!videoRef.current) return;

        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
    };

    const seekForward = async () => {
        if (!videoRef.current) return;
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
            await videoRef.current.setPositionAsync(status.positionMillis + 10000);
        }
    };

    const seekBackward = async () => {
        if (!videoRef.current) return;
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
            await videoRef.current.setPositionAsync(Math.max(0, status.positionMillis - 10000));
        }
    };

    const formatTime = (millis: number): string => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const toggleControls = () => {
        setShowControls((prev) => !prev);
    };

    if (error) {
        return (
            <View style={[styles.container, styles.errorContainer]}>
                <Ionicons name="alert-circle" size={48} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setError(null);
                        setIsLoading(true);
                    }}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={toggleControls}
                style={styles.videoWrapper}
            >
                <Video
                    ref={videoRef}
                    source={{ uri }}
                    posterSource={poster ? { uri: poster } : undefined}
                    usePoster
                    posterStyle={styles.poster}
                    style={styles.video}
                    resizeMode={ResizeMode.CONTAIN}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    useNativeControls={false}
                />

                {/* Loading Overlay */}
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={colors.white} />
                    </View>
                )}

                {/* Controls Overlay */}
                {showControls && !isLoading && (
                    <View style={styles.controlsOverlay}>
                        {/* Top Bar */}
                        {title && (
                            <View style={styles.topBar}>
                                <Text style={styles.titleText} numberOfLines={1}>
                                    {title}
                                </Text>
                            </View>
                        )}

                        {/* Center Controls */}
                        <View style={styles.centerControls}>
                            <TouchableOpacity style={styles.controlButton} onPress={seekBackward}>
                                <Ionicons name="play-back" size={32} color={colors.white} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.playPauseButton}
                                onPress={togglePlayPause}
                            >
                                <Ionicons
                                    name={isPlaying ? 'pause' : 'play'}
                                    size={40}
                                    color={colors.white}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.controlButton} onPress={seekForward}>
                                <Ionicons name="play-forward" size={32} color={colors.white} />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Bar */}
                        <View style={styles.bottomBar}>
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[styles.progressFill, { width: `${progress * 100}%` }]}
                                    />
                                </View>
                            </View>
                            <View style={styles.timeContainer}>
                                <Text style={styles.timeText}>
                                    {formatTime(progress * duration)} / {formatTime(duration)}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: SCREEN_WIDTH,
        height: VIDEO_HEIGHT,
        backgroundColor: colors.black,
    },
    videoWrapper: {
        flex: 1,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    poster: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'space-between',
    },
    topBar: {
        padding: spacing.md,
    },
    titleText: {
        color: colors.white,
        fontSize: fontSize.md,
        fontWeight: '500',
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlButton: {
        padding: spacing.md,
        marginHorizontal: spacing.lg,
    },
    playPauseButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        padding: spacing.md,
    },
    progressContainer: {
        marginBottom: spacing.sm,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 2,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    timeText: {
        color: colors.white,
        fontSize: fontSize.xs,
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: colors.white,
        fontSize: fontSize.md,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    retryButtonText: {
        color: colors.white,
        fontSize: fontSize.sm,
        fontWeight: '500',
    },
});

export default VideoPlayer;
