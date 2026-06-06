import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Loader2 } from 'lucide-react';

type VideoJsPlayer = ReturnType<typeof videojs>;

export interface SubtitleTrack {
    src: string;
    srclang: string;
    label: string;
    default?: boolean;
}

interface VideoPlayerProps {
    src: string;
    poster?: string;
    startTicks: number;
    subtitles?: SubtitleTrack[];
    onReady?: (player: VideoJsPlayer) => void;
    isAudioSwitchRef: React.MutableRefObject<boolean>;
    subtitleTrackIndex: number | null;
    subtitleOffset: number;
}

const VideoPlayer = ({
    src,
    poster,
    startTicks,
    subtitles,
    onReady,
    isAudioSwitchRef,
    subtitleTrackIndex,
    subtitleOffset,
}: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<VideoJsPlayer | null>(null);
    const hasSeekedRef = useRef(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [prevSrc, setPrevSrc] = useState(src);

    if (src !== prevSrc) {
        setPrevSrc(src);
        setIsBuffering(true);
    }

    useEffect(() => {
        if (!videoRef.current) return;

        const player = videojs(videoRef.current, {
            controls: false,
            autoplay: false,
            preload: 'auto',
            poster: poster,
            responsive: false,
            fluid: false,
            controlBar: false,
            bigPlayButton: false,
            loadingSpinner: false,
            errorDisplay: false,
            html5: {
                nativeControlsForTouch: false,
                hls: { overrideNative: true },
                nativeTextTracks: false,
            },
        });

        playerRef.current = player;

        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleSeeking = () => setIsBuffering(true);
        const handleSeeked = () => setIsBuffering(false);
        const handleLoadStart = () => setIsBuffering(true);

        player.on('waiting', handleWaiting);
        player.on('playing', handlePlaying);
        player.on('seeking', handleSeeking);
        player.on('seeked', handleSeeked);
        player.on('loadstart', handleLoadStart);

        player.ready(() => {
            onReady?.(player);
            player.play()?.catch((error) => {
                console.error('Error attempting to play:', error);
            });
        });

        return () => {
            if (playerRef.current) {
                const p = playerRef.current;
                p.off('waiting', handleWaiting);
                p.off('playing', handlePlaying);
                p.off('seeking', handleSeeking);
                p.off('seeked', handleSeeked);
                p.off('loadstart', handleLoadStart);
                p.dispose();
                playerRef.current = null;
            }
        };
    }, [onReady, poster]);

    useEffect(() => {
        if (!playerRef.current) return;
        if (!startTicks || startTicks <= 0) return;
        if (hasSeekedRef.current) return;

        const seconds = startTicks / 10_000_000;

        playerRef.current.currentTime(seconds);
        hasSeekedRef.current = true;
    }, [startTicks]);

    useEffect(() => {
        hasSeekedRef.current = false;
    }, [src]);

    useEffect(() => {
        if (!playerRef.current || !src) return;

        const player = playerRef.current;

        let seekTo: number | null = null;

        if (isAudioSwitchRef.current) {
            seekTo = player.currentTime() || null;
            isAudioSwitchRef.current = false;
        }

        player.pause();
        player.src({ src, type: 'application/x-mpegURL' });
        player.load();

        if (seekTo !== null) {
            player.currentTime(seekTo);
        }

        player.play()?.catch(console.error);
    }, [src, isAudioSwitchRef]);

    useEffect(() => {
        if (!playerRef.current) return;

        const player = playerRef.current;

        const addSubtitles = (activeIndex: number | null) => {
            const tracks = player.remoteTextTracks();
            while (tracks.tracks_.length > 0) {
                const track = tracks.tracks_[0];
                if (track) player.removeRemoteTextTrack(track);
            }

            if (subtitles && subtitles.length > 0) {
                subtitles.forEach((subtitle, index) => {
                    player.addRemoteTextTrack(
                        {
                            kind: 'subtitles',
                            src: subtitle.src,
                            srclang: subtitle.srclang,
                            label: subtitle.label,
                            default: subtitle.default,
                        },
                        false // Don't add to DOM manually
                    );

                    const addedTrack = player.remoteTextTracks().tracks_[index];
                    if (addedTrack) {
                        addedTrack.mode = index === activeIndex ? 'showing' : 'disabled';
                    }
                });
            }
        };

        addSubtitles(subtitleTrackIndex);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                addSubtitles(subtitleTrackIndex);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [subtitles, src, subtitleTrackIndex]);

    useEffect(() => {
        if (!playerRef.current) return;
        const player = playerRef.current;

        const applyOffset = () => {
            const tracksList = player.textTracks() as any;
            const tracks = tracksList.tracks_ || Array.from(tracksList);
            for (let t = 0; t < tracks.length; t++) {
                const track = tracks[t];
                const cues = track.cues;
                if (!cues) continue;
                for (let i = 0; i < cues.length; i++) {
                    const cue = cues[i] as any;
                    if (cue.originalStartTime === undefined) {
                        cue.originalStartTime = cue.startTime;
                    }
                    if (cue.originalEndTime === undefined) {
                        cue.originalEndTime = cue.endTime;
                    }
                    cue.startTime = cue.originalStartTime + subtitleOffset;
                    cue.endTime = cue.originalEndTime + subtitleOffset;
                }
            }
        };

        applyOffset();

        const tracks = player.textTracks();
        const handleTrackLoad = () => {
            applyOffset();
        };

        tracks.addEventListener('addtrack', handleTrackLoad);
        tracks.addEventListener('change', handleTrackLoad);

        // Periodically verify or apply to handle late loaded remote tracks
        const interval = setInterval(applyOffset, 1000);

        return () => {
            tracks.removeEventListener('addtrack', handleTrackLoad);
            tracks.removeEventListener('change', handleTrackLoad);
            clearInterval(interval);
        };
    }, [subtitleOffset]);

    return (
        <div
            className="w-full h-full overflow-hidden relative"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <video
                ref={videoRef}
                className="video-js"
                data-testid="video-player"
                style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%' }}
            >
                <track kind="captions" srcLang="en" label="English" />
            </video>
            {isBuffering && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
