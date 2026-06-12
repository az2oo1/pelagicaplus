import { useEffect } from 'react';

const getFocusableElements = (container: HTMLElement | Document = document): HTMLElement[] => {
    // Select all links, buttons, inputs, selects, textareas, and tabindex focusable elements.
    // We explicitly allow [role="tab"] and [data-slot="tabs-trigger"] to match roving-tabindex tab triggers (which can have tabindex="-1" when inactive).
    const selector = 'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"]), [role="tab"], [data-slot="tabs-trigger"]';
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    
    // Filter to only visible elements
    return elements.filter(el => {
        const rect = el.getBoundingClientRect();
        // Exclude elements that are extremely small/visually hidden
        if (rect.width <= 4 || rect.height <= 4) return false;
        
        // Exclude Radix focus guards and screen-reader only elements
        if (el.hasAttribute('data-radix-focus-guard') || el.closest('[data-radix-focus-guard]')) return false;
        if (el.classList.contains('sr-only') || el.closest('.sr-only')) return false;
        
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });
};

export const SpatialNavigation = () => {
    useEffect(() => {
        let lastMoveTime = 0;

        // Try focusing home button on mount
        const timer = setTimeout(() => {
            const homeBtn = document.getElementById('home-nav-button');
            if (homeBtn) {
                homeBtn.focus();
            }
        }, 150);

        const handleKeyDown = (e: KeyboardEvent) => {
            const direction = e.key;
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(direction)) {
                return;
            }

            const now = Date.now();
            if (now - lastMoveTime < 110) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            const activeEl = document.activeElement as HTMLElement;
            
            // Ignore key events if focus is inside editable fields or if select/dropdown contents are open (letting Radix handle listboxes/menus)
            const shouldBypass = activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.tagName === 'SELECT' || 
                activeEl.isContentEditable ||
                activeEl.closest('[role="menu"], [role="listbox"], [data-slot="dropdown-menu-content"], [data-slot="dropdown-menu-sub-content"], [data-slot="select-content"]') !== null
            );
            if (shouldBypass) {
                return;
            }

            // We handle the navigation, so prevent default and stop propagation (especially in capture phase)
            e.preventDefault();
            e.stopPropagation();

            // Restrict focus search to modal dialog/menu container if focus is currently inside one.
            const modalContainer = activeEl ? (activeEl.closest('[role="dialog"], [data-slot="dialog-content"], [data-slot="sheet-content"]') as HTMLElement) : null;
            const focusables = getFocusableElements(modalContainer || document);
            if (focusables.length === 0) return;

            // Default to Home button or first element if nothing or body is focused
            if (!activeEl || activeEl === document.body) {
                const homeBtn = document.getElementById('home-nav-button') || focusables[0];
                if (homeBtn) {
                    homeBtn.focus({ preventScroll: true });
                    homeBtn.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'start',
                    });
                    lastMoveTime = now;
                }
                return;
            }

            const activeRect = activeEl.getBoundingClientRect();
            const activeCenter = {
                x: activeRect.left + activeRect.width / 2,
                y: activeRect.top + activeRect.height / 2,
            };

            const activeInHeader = activeEl.closest('header') !== null;

            // Check if there are focusable content elements (below the top bar / not in the header) above the active element
            const hasContentAbove = focusables.some(candidate => {
                if (candidate === activeEl) return false;
                if (candidate.closest('header') !== null) return false;
                const rect = candidate.getBoundingClientRect();
                return rect.bottom <= activeRect.top + 10;
            });

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
                    isCorrectDirection = dx > 0.1 && Math.abs(dy) <= 50; // horizontal move must stay in same row
                    score = dx + Math.abs(dy) * 4;
                } else if (direction === 'ArrowLeft') {
                    isCorrectDirection = dx < -0.1 && Math.abs(dy) <= 50;
                    score = Math.abs(dx) + Math.abs(dy) * 4;
                } else if (direction === 'ArrowDown') {
                    isCorrectDirection = dy > 0.1;
                    score = dy + Math.abs(dx) * 4;
                } else if (direction === 'ArrowUp') {
                    isCorrectDirection = dy < -0.1;
                    const candidateInHeader = candidate.closest('header') !== null;
                    // If we are in the content area and there is content above us, exclude header elements
                    if (!activeInHeader && hasContentAbove && candidateInHeader) {
                        isCorrectDirection = false;
                    }
                    score = Math.abs(dy) + Math.abs(dx) * 4;
                    // If moving from the topmost content into the header, prioritize the Home button
                    if (!activeInHeader && !hasContentAbove && candidateInHeader) {
                        if (candidate.id === 'home-nav-button') {
                            score = Math.abs(dy) - 1000;
                        }
                    }
                }

                if (isCorrectDirection && score < minScore) {
                    minScore = score;
                    bestCandidate = candidate;
                }
            });

            if (bestCandidate) {
                const element = bestCandidate as HTMLElement;
                element.focus({ preventScroll: true });
                
                const isHorizontal = ['ArrowLeft', 'ArrowRight'].includes(direction);
                const inHeader = element.closest('header') !== null;

                if (inHeader) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'nearest',
                    });
                } else {
                    const parent = element.parentElement;
                    if (parent && element === parent.firstElementChild) {
                        parent.scrollTo({ left: 0, behavior: 'smooth' });
                    } else {
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: isHorizontal ? 'nearest' : 'center',
                            inline: 'start',
                        });
                    }
                }
                lastMoveTime = now;
            }
        };

        // Attach event listener in the capture phase to intercept keys before component-specific roving handlers
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, []);

    return null;
};

export default SpatialNavigation;
