import { cn } from '@/lib/utils';

interface SplashScreenProps {
    progress: number;
    message: string;
    logoSrc: string;
    fadeOut: boolean;
}

export default function SplashScreen({ progress, message, logoSrc, fadeOut }: SplashScreenProps) {
    return (
        <div
            className={cn(
                'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-all duration-500 ease-in-out',
                fadeOut && 'opacity-0 pointer-events-none'
            )}
        >
            <div className="flex flex-col items-center max-w-sm w-full px-6 text-center">
                {/* Minimalist Pulsing Logo */}
                <div className="relative w-20 h-20 flex items-center justify-center select-none animate-pulse">
                    <img
                        src={logoSrc}
                        alt="Pelagica Logo"
                        className="w-16 h-16 object-contain relative z-10"
                        onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/logo.svg';
                        }}
                    />
                </div>

                {/* Theme-aligned Minimalist Progress Bar */}
                <div className="w-48 h-1 bg-muted rounded-full overflow-hidden mt-8 relative">
                    <div
                        className="h-full bg-brand rounded-full transition-all duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Status Message */}
                <div className="text-xs text-muted-foreground mt-3 font-medium tracking-wide select-none">
                    {message}
                </div>

                {/* Percentage */}
                <div className="text-[10px] text-muted-foreground/60 font-mono mt-1 select-none">
                    {progress}%
                </div>
            </div>
        </div>
    );
}
