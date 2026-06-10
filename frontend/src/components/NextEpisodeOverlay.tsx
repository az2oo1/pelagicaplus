import { useEffect, useState } from 'react';
import { SkipForward, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { ticksToReadableTime } from '@/utils/timeConversion';

const COUNTDOWN_SECONDS = 10;
const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface NextEpisodeOverlayProps {
    nextItem: BaseItemDto;
    onPlay: () => void;
    onDismiss: () => void;
}

const NextEpisodeOverlay = ({ nextItem, onPlay, onDismiss }: NextEpisodeOverlayProps) => {
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

    useEffect(() => {
        if (countdown <= 0) {
            onPlay();
            return;
        }
        const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, onPlay]);

    const progress = (countdown / COUNTDOWN_SECONDS) * CIRCUMFERENCE;

    return (
        <div className="flex flex-col items-end gap-3 w-72 md:w-80">
            <div className="bg-black/85 backdrop-blur-sm rounded-xl overflow-hidden w-full border border-white/10 shadow-2xl">
                <div className="relative">
                    <img
                        src={getPrimaryImageUrl(nextItem.Id!, { height: 180, width: 320 })}
                        alt={nextItem.Name || ''}
                        className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>

                <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
                    <div>
                        <p className="text-xs text-white/50 uppercase tracking-wider mb-0.5">
                            Nächste Folge
                        </p>
                        {nextItem.Type === 'Episode' && (
                            <p className="text-xs text-white/60 mb-0.5">
                                S{nextItem.ParentIndexNumber} E{nextItem.IndexNumber}
                            </p>
                        )}
                        <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
                            {nextItem.Name}
                        </p>
                        {nextItem.RunTimeTicks && (
                            <p className="text-white/40 text-xs mt-0.5">
                                {ticksToReadableTime(nextItem.RunTimeTicks)}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            className="flex-1 gap-2"
                            onClick={onPlay}
                        >
                            <SkipForward className="w-4 h-4" />
                            Jetzt schauen
                        </Button>

                        <div className="relative flex-shrink-0 w-10 h-10 cursor-pointer" onClick={onDismiss} title="Abbrechen">
                            <svg width="40" height="40" className="rotate-[-90deg]">
                                <circle
                                    cx="20"
                                    cy="20"
                                    r={RADIUS}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.15)"
                                    strokeWidth="3"
                                />
                                <circle
                                    cx="20"
                                    cy="20"
                                    r={RADIUS}
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="3"
                                    strokeDasharray={CIRCUMFERENCE}
                                    strokeDashoffset={CIRCUMFERENCE - progress}
                                    strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                                {countdown}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <button
                onClick={onDismiss}
                className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 text-xs"
            >
                <X className="w-3 h-3" />
                Abbrechen
            </button>
        </div>
    );
};

export default NextEpisodeOverlay;
