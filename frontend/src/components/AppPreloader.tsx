import { type PropsWithChildren, useEffect, useState } from 'react';
import type { AppConfig } from '@/hooks/api/useConfig';
import SplashScreen from './SplashScreen';

export function AppPreloader({ children }: PropsWithChildren) {
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState('Initializing...');
    const [logoSrc, setLogoSrc] = useState('/logo.svg');
    const [fadeOut, setFadeOut] = useState(false);
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        let active = true;

        async function startPreload() {
            const startTime = Date.now();
            const minSplashDuration = 900; // snappy boot time (900ms)
            let completedSteps = 0;
            let totalSteps = 4; // Fetch config, resolve theme, preload logo 1, preload logo 2

            const updateProgress = (stepNum: number, total: number, msg: string) => {
                if (!active) return;
                const percentage = Math.round((stepNum / total) * 100);
                setProgress(Math.min(percentage, 100));
                setMessage(msg);
            };

            updateProgress(0, totalSteps, 'Initializing...');

            // Step 1: Fetch Configuration (to discover custom logos if any)
            let configData: Partial<AppConfig> | null = null;
            try {
                const configResponse = await fetch('/api/config');
                if (configResponse.ok) {
                    configData = await configResponse.json();
                }
            } catch (err) {
                console.warn('Preloader: Could not fetch configuration', err);
            }
            completedSteps++;
            updateProgress(completedSteps, totalSteps, 'Loading...');

            // Step 2: Determine Logo URLs and active theme
            const theme = localStorage.getItem('vite-ui-theme') || 'system';
            const isDark =
                theme === 'system'
                    ? window.matchMedia('(prefers-color-scheme: dark)').matches
                    : theme === 'dark';

            const defaultLogo = isDark ? '/logo.svg' : '/logo-dark.svg';
            const configuredLogo = isDark ? configData?.logoDarkUrl : configData?.logoLightUrl;
            const activeLogo = configuredLogo || defaultLogo;

            if (activeLogo) {
                setLogoSrc(activeLogo);
            }
            completedSteps++;
            updateProgress(completedSteps, totalSteps, 'Setting up theme...');

            // Build list of logos to preload (to prevent logo flickering when pages load)
            const logosToPreload = ['/logo.svg', '/logo-dark.svg'];
            if (configuredLogo) logosToPreload.push(configuredLogo);

            // Filter unique
            const uniqueLogos = Array.from(new Set(logosToPreload)).filter(Boolean);
            totalSteps = 2 + uniqueLogos.length;
            completedSteps = 2;

            // Preload logo images
            await Promise.all(
                uniqueLogos.map((url) => {
                    return new Promise<void>((resolve) => {
                        const img = new Image();
                        img.onload = img.onerror = () => {
                            if (active) {
                                completedSteps++;
                                updateProgress(completedSteps, totalSteps, 'Loading assets...');
                            }
                            resolve();
                        };
                        img.src = url;
                    });
                })
            );

            // Finished preload
            updateProgress(totalSteps, totalSteps, 'Done');

            // Guarantee a minimum duration so the animation plays out nicely
            const elapsed = Date.now() - startTime;
            const delay = Math.max(0, minSplashDuration - elapsed);

            if (delay > 0) {
                await new Promise((resolve) => setTimeout(resolve, delay));
            }

            if (active) {
                setFadeOut(true);
                // Wait for the CSS opacity transition to finish before removing overlay from DOM
                setTimeout(() => {
                    if (active) {
                        setShowSplash(false);
                    }
                }, 550);
            }
        }

        startPreload();

        return () => {
            active = false;
        };
    }, []);

    return (
        <>
            {showSplash && (
                <SplashScreen
                    progress={progress}
                    message={message}
                    logoSrc={logoSrc}
                    fadeOut={fadeOut}
                />
            )}
            {children}
        </>
    );
}
