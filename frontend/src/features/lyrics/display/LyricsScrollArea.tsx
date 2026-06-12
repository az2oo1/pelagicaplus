import { useState, useEffect, useRef, type PropsWithChildren, type RefObject } from 'react';
import { cn } from '@/lib/utils';

interface LyricsScrollAreaProps extends PropsWithChildren {
    containerRef: RefObject<HTMLDivElement | null>;
    edgePadding: number;
    onUserScroll?: () => void;
}

const LyricsScrollArea = ({
    containerRef,
    edgePadding,
    onUserScroll,
    children,
}: LyricsScrollAreaProps) => {
    const [isScrolling, setIsScrolling] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1500); // Keep scrollbar visible for 1.5s after last user scroll interaction
    };

    const startScrolling = () => {
        setIsScrolling(true);
        resetTimeout();
    };

    const handleScroll = () => {
        if (isScrolling) {
            resetTimeout();
            if (onUserScroll) {
                onUserScroll();
            }
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "h-full overflow-y-auto overscroll-contain scroll-smooth",
                !isScrolling && "scrollbar-hide"
            )}
            onScroll={handleScroll}
            onWheel={startScrolling}
            onTouchStart={startScrolling}
            onTouchMove={startScrolling}
        >
            <div
                className="flex flex-col items-center gap-5 px-4"
                style={{ paddingTop: edgePadding, paddingBottom: edgePadding }}
            >
                {children}
            </div>
        </div>
    );
};

export default LyricsScrollArea;
