import { useCallback, useEffect, useRef, useState } from 'react';
import type { LyricLine } from '@jellyfin/sdk/lib/generated-client/models';
import { applyOffset, getActiveLineIndex } from '../utils/lyrics';

interface UseSyncedLyricsOptions {
    lines: LyricLine[];
    currentTime: number;
    offset?: number | null;
    enabled?: boolean;
}

export function useSyncedLyrics({
    lines,
    currentTime,
    offset,
    enabled = true,
}: UseSyncedLyricsOptions) {
    const [activeIndex, setActiveIndex] = useState(-1);
    const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
    const lineRefs = useRef<(HTMLElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!enabled || !lines.length) {
            setActiveIndex(-1);
            return;
        }

        const adjustedTime = applyOffset(currentTime, offset);
        setActiveIndex(getActiveLineIndex(adjustedTime, lines));
    }, [currentTime, enabled, lines, offset]);

    useEffect(() => {
        if (!enabled || !autoScrollEnabled || activeIndex < 0) {
            return;
        }

        const activeLine = lineRefs.current[activeIndex];
        activeLine?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [activeIndex, autoScrollEnabled, enabled]);

    const disableAutoScroll = useCallback(() => {
        setAutoScrollEnabled(false);
    }, []);

    const enableAutoScroll = useCallback(() => {
        setAutoScrollEnabled(true);
    }, []);

    const setLineRef = useCallback((index: number, element: HTMLElement | null) => {
        lineRefs.current[index] = element;
    }, []);

    return {
        activeIndex,
        autoScrollEnabled,
        containerRef,
        disableAutoScroll,
        enableAutoScroll,
        setLineRef,
    };
}
