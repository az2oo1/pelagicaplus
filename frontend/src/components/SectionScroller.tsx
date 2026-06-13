import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';

interface SectionScrollerProps {
    title?: React.ReactNode;
    items: React.ReactNode[];
    icon?: React.ReactNode;
    className?: string;
    additionalButtons?: React.ReactNode;
    contentInset?: boolean;
}

export default function SectionScroller({
    title,
    items,
    className,
    additionalButtons,
    contentInset = false,
}: SectionScrollerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    // Drag-to-scroll states
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const dragDistance = useRef(0);

    const checkScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth);
    };

    const scroll = (offset: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const el = scrollRef.current;
        if (!el) return;
        setIsDragging(true);
        startX.current = e.pageX - el.offsetLeft;
        scrollLeft.current = el.scrollLeft;
        dragDistance.current = 0;
        el.style.scrollBehavior = 'auto';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const el = scrollRef.current;
        if (!el) return;
        
        const x = e.pageX - el.offsetLeft;
        const diff = x - startX.current;
        dragDistance.current = Math.abs(diff);

        e.preventDefault();
        const walk = diff * 1.5; // multiplier for drag speed
        el.scrollLeft = scrollLeft.current - walk;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
        const el = scrollRef.current;
        if (el) {
            el.style.scrollBehavior = '';
        }
    };

    const handleClickCapture = (e: React.MouseEvent) => {
        if (dragDistance.current > 5) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        checkScroll();

        el.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        return () => {
            el.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [items.length]);

    return (
        <div className={className}>
            <div
                className={
                    'flex items-center justify-between mb-3' +
                    (contentInset ? ` px-4 sm:px-12` : '')
                }
            >
                {title ? title : <div />}

                <div className="flex gap-2">
                    <Button
                        onClick={() => scroll(-300)}
                        disabled={!canScrollLeft}
                        size={'icon'}
                        variant={'outline'}
                        tabIndex={-1}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        onClick={() => scroll(300)}
                        disabled={!canScrollRight}
                        size={'icon'}
                        variant={'outline'}
                        tabIndex={-1}
                    >
                        <ChevronRight />
                    </Button>
                    {additionalButtons}
                </div>
            </div>

            <div
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onClickCapture={handleClickCapture}
                className={
                    'flex gap-4 overflow-x-auto scroll-smooth scrollbar-hide custom-scrollbar select-none ' +
                    (isDragging ? 'cursor-grabbing ' : 'cursor-grab ') +
                    (contentInset ? ` pl-4 sm:pl-12` : '')
                }
            >
                {items}
            </div>
        </div>
    );
}
