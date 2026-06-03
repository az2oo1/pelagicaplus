import type { ProcessedLyrics } from '../types';
import StaticLines from './StaticLines';
import SyncedLines from './SyncedLines';

interface LyricsDisplayProps {
    lyrics: ProcessedLyrics;
    currentTime: number;
    onLineClick: (startTicks: number) => void;
    enabled?: boolean;
}

const LyricsDisplay = ({
    lyrics,
    currentTime,
    onLineClick,
    enabled = true,
}: LyricsDisplayProps) => {
    if (lyrics.isSynced) {
        return (
            <SyncedLines
                lines={lyrics.lines}
                currentTime={currentTime}
                offset={lyrics.offset}
                onLineClick={onLineClick}
                enabled={enabled}
            />
        );
    }

    return <StaticLines lines={lyrics.lines} enabled={enabled} />;
};

export default LyricsDisplay;
