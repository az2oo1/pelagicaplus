import type { LyricDto, LyricLine } from '@jellyfin/sdk/lib/generated-client/models';
import type { ProcessedLyrics } from '../types';

export function applyOffset(currentTime: number, offset?: number | null): number {
    return currentTime - (offset ?? 0);
}

export function isSyncedLyrics(lines: LyricLine[], metadata?: LyricDto['Metadata']): boolean {
    if (metadata?.IsSynced != null) {
        return metadata.IsSynced;
    }

    if (!lines.length) {
        return false;
    }

    return Object.prototype.hasOwnProperty.call(lines[0], 'Start');
}

export function getActiveLineIndex(time: number, lines: LyricLine[]): number {
    if (!lines.length) {
        return -1;
    }

    for (let i = lines.length - 1; i >= 0; i--) {
        if ((lines[i].Start ?? 0) <= time) {
            return i;
        }
    }

    return -1;
}

export function processLyrics(data: LyricDto | undefined): ProcessedLyrics | null {
    const lines = data?.Lyrics ?? [];
    if (!lines.length) {
        return null;
    }

    return {
        lines,
        isSynced: isSyncedLyrics(lines, data?.Metadata),
        offset: data?.Metadata?.Offset ?? 0,
        metadata: data?.Metadata,
    };
}

export function resolveDisplayMode(processed: ProcessedLyrics | null): 'synced' | 'static' | null {
    if (!processed) {
        return null;
    }

    return processed.isSynced ? 'synced' : 'static';
}
