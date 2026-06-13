import { useEffect } from 'react';

const getFocusableElements = (container: HTMLElement | Document = document): HTMLElement[] => {
    // Select all links, buttons, inputs, selects, textareas, and tabindex focusable elements.
    // We explicitly allow [role="tab"] and [data-slot="tabs-trigger"] to match roving-tabindex tab triggers (which can have tabindex="-1" when inactive).
    const selector = 'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"]), [role="tab"], [data-slot="tabs-trigger"], [role="tablist"] button, [data-slot="tabs-list"] button';
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
            const inTablist = activeEl && activeEl.closest('[role="tablist"], [data-slot="tabs-list"]') !== null;
            if (shouldBypass || (inTablist && ['ArrowLeft', 'ArrowRight'].includes(direction))) {
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

            const activeTablist = activeEl.closest('[role="tablist"]');
            let candidates = focusables;
            if (activeTablist && ['ArrowLeft', 'ArrowRight'].includes(direction)) {
                candidates = focusables.filter(candidate => candidate.closest('[role="tablist"]') === activeTablist);
            }

            let bestCandidate: HTMLElement | null = null;
            let minScore = Infinity;

            candidates.forEach(candidate => {
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

                const activeTablist = activeEl.closest('[role="tablist"]');
                const candidateTablist = candidate.closest('[role="tablist"]');
                const isSameTablist = activeTablist !== null && activeTablist === candidateTablist;

                // Move calculation weights: prioritize closer elements along the primary axis,
                // and penalize orthogonal deviation (multiplying by 4 to prefer horizontal align when moving horizontally)
                if (direction === 'ArrowRight') {
                    const isSameRow = isSameTablist || Math.abs(dy) <= 50;
                    isCorrectDirection = dx > 0.1 && isSameRow;
                    score = dx + Math.abs(dy) * 4;
                } else if (direction === 'ArrowLeft') {
                    const isSameRow = isSameTablist || Math.abs(dy) <= 50;
                    isCorrectDirection = dx < -0.1 && isSameRow;
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
                
                const isStickyOrFixed = element.closest('.sticky, .fixed, [class*="sticky"], [class*="fixed"]') !== null || 
                                        element.closest('header') !== null;

                const isControl = element.tagName === 'BUTTON' || 
                                  element.tagName === 'SELECT' || 
                                  element.closest('[role="tablist"]') !== null ||
                                  element.closest('header') !== null ||
                                  element.closest('.sticky') !== null ||
                                  element.closest('.fixed') !== null;

                const carouselContainer = element.closest('[data-slot="carousel"]') as HTMLElement;
                if (carouselContainer) {
                    const rect = element.getBoundingClientRect();
                    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
                    const isElementVerticallyInViewport = rect.top >= 0 && rect.bottom <= viewHeight;
                    if (!isElementVerticallyInViewport) {
                        carouselContainer.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center',
                            inline: 'nearest',
                        });
                    }
                } else if (!isStickyOrFixed) {
                    const rect = element.getBoundingClientRect();
                    const viewWidth = window.innerWidth || document.documentElement.clientWidth;
                    const viewHeight = window.innerHeight || document.documentElement.clientHeight;
                    const inViewport = 
                        rect.top >= 0 && 
                        rect.left >= 0 && 
                        rect.bottom <= viewHeight && 
                        rect.right <= viewWidth;

                    if (!inViewport) {
                        if (isControl) {
                            element.scrollIntoView({
                                behavior: 'smooth',
                                block: isHorizontal ? 'nearest' : 'center',
                                inline: 'nearest',
                            });
                        } else {
                            if (isHorizontal) {
                                const parent = element.parentElement;
                                if (parent && element === parent.firstElementChild) {
                                    parent.scrollTo({ left: 0, behavior: 'smooth' });
                                } else {
                                    element.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'nearest',
                                        inline: 'start',
                                    });
                                }
                            } else {
                                element.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                    inline: 'nearest',
                                });
                            }
                        }
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

    // Gamepad controller support loop
    useEffect(() => {
        let requestId: number | null = null;
        const prevButtonStates: Record<number, boolean> = {};
        const prevDpadStates: Record<string, boolean> = {};
        let lastActionTime = 0;

        const checkGamepad = () => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = gamepads.find(g => g !== null);
            
            if (!gp) {
                requestId = requestAnimationFrame(checkGamepad);
                return;
            }

            const now = Date.now();
            const cooldown = 220; // ms cooldown for repeated movement

            let moveKey: string | null = null;
            
            // D-pad buttons: 12 (Up), 13 (Down), 14 (Left), 15 (Right)
            const dpadUp = gp.buttons[12]?.pressed;
            const dpadDown = gp.buttons[13]?.pressed;
            const dpadLeft = gp.buttons[14]?.pressed;
            const dpadRight = gp.buttons[15]?.pressed;

            // Sticks axes: 0 (Left Stick X), 1 (Left Stick Y)
            const axisX = gp.axes[0] || 0;
            const axisY = gp.axes[1] || 0;

            if (dpadUp || axisY < -0.5) moveKey = 'ArrowUp';
            else if (dpadDown || axisY > 0.5) moveKey = 'ArrowDown';
            else if (dpadLeft || axisX < -0.5) moveKey = 'ArrowLeft';
            else if (dpadRight || axisX > 0.5) moveKey = 'ArrowRight';

            if (moveKey) {
                if (now - lastActionTime > cooldown || !prevDpadStates[moveKey]) {
                    const event = new KeyboardEvent('keydown', {
                        key: moveKey,
                        bubbles: true,
                        cancelable: true
                    });
                    window.dispatchEvent(event);
                    lastActionTime = now;
                    // Reset all dpad states and set the active one
                    prevDpadStates[moveKey] = true;
                }
            } else {
                // Clear all previous dpad press states when keys/axes are released
                Object.keys(prevDpadStates).forEach(k => delete prevDpadStates[k]);
            }

            // Button 0: Cross (X) - Trigger click on active element
            const btnCross = gp.buttons[0]?.pressed || false;
            if (btnCross && !prevButtonStates[0]) {
                const activeEl = document.activeElement as HTMLElement;
                if (activeEl && activeEl !== document.body) {
                    activeEl.click();
                }
            }
            prevButtonStates[0] = btnCross;

            // Button 1: Circle (O) - Go back / Close overlay / Escape
            const btnCircle = gp.buttons[1]?.pressed || false;
            if (btnCircle && !prevButtonStates[1]) {
                const event = new KeyboardEvent('keydown', {
                    key: 'Escape',
                    bubbles: true,
                    cancelable: true
                });
                window.dispatchEvent(event);
            }
            prevButtonStates[1] = btnCircle;

            // Button 3: Triangle (/\) - Open context menu (simulate right click)
            const btnTriangle = gp.buttons[3]?.pressed || false;
            if (btnTriangle && !prevButtonStates[3]) {
                const activeEl = document.activeElement as HTMLElement;
                if (activeEl && activeEl !== document.body) {
                    const rect = activeEl.getBoundingClientRect();
                    const clickX = rect.left + rect.width / 2;
                    const clickY = rect.top + rect.height / 2;
                    const contextEvent = new MouseEvent('contextmenu', {
                        bubbles: true,
                        cancelable: true,
                        clientX: clickX,
                        clientY: clickY
                    });
                    activeEl.dispatchEvent(contextEvent);
                }
            }
            prevButtonStates[3] = btnTriangle;

            requestId = requestAnimationFrame(checkGamepad);
        };

        requestId = requestAnimationFrame(checkGamepad);
        return () => {
            if (requestId !== null) {
                cancelAnimationFrame(requestId);
            }
        };
    }, []);

    return null;
};

export default SpatialNavigation;
