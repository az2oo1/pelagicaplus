import type { LyricDto, LyricLine } from '@jellyfin/sdk/lib/generated-client/models';

export type LyricsDisplayMode = 'synced' | 'static';

export type LyricLineState = 'past' | 'active' | 'future';

export interface ProcessedLyrics {
    lines: LyricLine[];
    isSynced: boolean;
    offset: number;
    metadata: LyricDto['Metadata'];
}

export interface SyncedLyricsOptions {
    lines: LyricLine[];
    currentTime: number;
    offset?: number | null;
    enabled?: boolean;
}
