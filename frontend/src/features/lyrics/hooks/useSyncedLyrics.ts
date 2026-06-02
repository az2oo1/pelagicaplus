import { useCallback, useEffect, useRef, useState } from 'react';
import type { LyricLine } from '@jellyfin/sdk/lib/generated-client/models';
import { lyricsAutoScrollGraceMs } from '../constants';
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
    const [edgePadding, setEdgePadding] = useState(0);
    const lineRefs = useRef<(HTMLElement | null)[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isProgrammaticScrollRef = useRef(false);

    const clearGraceTimer = useCallback(() => {
        if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!enabled || !lines.length) {
            setActiveIndex(-1);
            return;
        }

        const adjustedTime = applyOffset(currentTime, offset);
        setActiveIndex(getActiveLineIndex(adjustedTime, lines));
    }, [currentTime, enabled, lines, offset]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        const updatePadding = () => {
            setEdgePadding(Math.max(container.clientHeight / 2 - 24, 0));
        };

        updatePadding();

        const observer = new ResizeObserver(updatePadding);
        observer.observe(container);

        return () => observer.disconnect();
    }, [enabled, lines.length]);

    useEffect(() => clearGraceTimer, [clearGraceTimer]);

    const scrollActiveLineIntoView = useCallback(
        (behavior: ScrollBehavior = 'smooth') => {
            const container = containerRef.current;
            const activeLine = lineRefs.current[activeIndex];
            if (!container || !activeLine || activeIndex < 0) {
                return;
            }

            const lineTop =
                activeLine.getBoundingClientRect().top -
                container.getBoundingClientRect().top +
                container.scrollTop;
            const targetScrollTop = lineTop - container.clientHeight / 2 + activeLine.clientHeight / 2;

            isProgrammaticScrollRef.current = true;
            container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior,
            });
            window.setTimeout(() => {
                isProgrammaticScrollRef.current = false;
            }, 100);
        },
        [activeIndex],
    );

    useEffect(() => {
        if (!enabled || !autoScrollEnabled || activeIndex < 0) {
            return;
        }

        scrollActiveLineIntoView('smooth');
    }, [activeIndex, autoScrollEnabled, enabled, scrollActiveLineIntoView]);

    const pauseAutoScroll = useCallback(() => {
        setAutoScrollEnabled(false);
        clearGraceTimer();

        graceTimerRef.current = setTimeout(() => {
            setAutoScrollEnabled(true);
        }, lyricsAutoScrollGraceMs);
    }, [clearGraceTimer]);

    const onUserScroll = useCallback(() => {
        if (isProgrammaticScrollRef.current) {
            return;
        }

        pauseAutoScroll();
    }, [pauseAutoScroll]);

    const enableAutoScroll = useCallback(() => {
        clearGraceTimer();
        setAutoScrollEnabled(true);
    }, [clearGraceTimer]);

    const setLineRef = useCallback((index: number, element: HTMLElement | null) => {
        lineRefs.current[index] = element;
    }, []);

    return {
        activeIndex,
        autoScrollEnabled,
        containerRef,
        edgePadding,
        enableAutoScroll,
        onUserScroll,
        scrollActiveLineIntoView,
        setLineRef,
    };
}
