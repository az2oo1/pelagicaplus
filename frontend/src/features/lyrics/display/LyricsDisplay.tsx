import { useTranslation } from 'react-i18next';
import type { ProcessedLyrics } from '../types';
import StaticLines from './StaticLines';
import SyncedLines from './SyncedLines';

interface LyricsDisplayProps {
    lyrics: ProcessedLyrics;
    currentTime: number;
    onLineClick: (startTicks: number) => void;
}

const LyricsDisplay = ({ lyrics, currentTime, onLineClick }: LyricsDisplayProps) => {
    const { t } = useTranslation('player');

    if (lyrics.isSynced) {
        return (
            <SyncedLines
                lines={lyrics.lines}
                currentTime={currentTime}
                offset={lyrics.offset}
                onLineClick={onLineClick}
            />
        );
    }

    return (
        <div className="h-full overflow-y-auto overscroll-contain">
            <p className="px-4 pt-4 text-xs text-muted-foreground">{t('unsyncedLyrics')}</p>
            <StaticLines lines={lyrics.lines} />
        </div>
    );
};

export default LyricsDisplay;
