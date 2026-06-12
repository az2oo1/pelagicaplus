import { useEffect } from 'react';

const getFocusableElements = (): HTMLElement[] => {
    // Select all links, buttons, inputs, selects, textareas, and tabindex focusable elements
    const selector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    
    // Filter to only visible elements
    return elements.filter(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });
};

export const SpatialNavigation = () => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement as HTMLElement;
            
            // Ignore if focus is in an input/textarea/editable element
            if (activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.tagName === 'SELECT' || 
                activeEl.isContentEditable
            )) {
                return;
            }

            const direction = e.key;
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(direction)) {
                return;
            }

            const focusables = getFocusableElements();
            if (focusables.length === 0) return;

            e.preventDefault();

            // Default to first element if nothing or body is focused
            if (!activeEl || activeEl === document.body) {
                focusables[0].focus();
                return;
            }

            const activeRect = activeEl.getBoundingClientRect();
            const activeCenter = {
                x: activeRect.left + activeRect.width / 2,
                y: activeRect.top + activeRect.height / 2,
            };

            let bestCandidate: HTMLElement | null = null;
            let minScore = Infinity;

            focusables.forEach(candidate => {
                if (candidate === activeEl) return;

                const candidateRect = candidate.getBoundingClientRect();
                const candidateCenter = {
                    x: candidateRect.left + candidateRect.width / 2,
                    y: candidateRect.top + candidateRect.height / 2,
                };

                const dx = candidateCenter.x - activeCenter.x;
                const dy = candidateCenter.y - activeCenter.y;

                let isCorrectDirection = false;
                let score = 0;

                // Move calculation weights: prioritize closer elements along the primary axis,
                // and penalize orthogonal deviation (multiplying by 4 to prefer horizontal align when moving horizontally)
                if (direction === 'ArrowRight') {
                    isCorrectDirection = dx > 0.1; // small tolerance threshold
                    score = dx + Math.abs(dy) * 4;
                } else if (direction === 'ArrowLeft') {
                    isCorrectDirection = dx < -0.1;
                    score = Math.abs(dx) + Math.abs(dy) * 4;
                } else if (direction === 'ArrowDown') {
                    isCorrectDirection = dy > 0.1;
                    score = dy + Math.abs(dx) * 4;
                } else if (direction === 'ArrowUp') {
                    isCorrectDirection = dy < -0.1;
                    score = Math.abs(dy) + Math.abs(dx) * 4;
                }

                if (isCorrectDirection && score < minScore) {
                    minScore = score;
                    bestCandidate = candidate;
                }
            });

            if (bestCandidate) {
                (bestCandidate as HTMLElement).focus();
                // Smoothly center the newly focused item in its scrollable container or view
                bestCandidate.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return null;
};

export default SpatialNavigation;
