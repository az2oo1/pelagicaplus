import React, { useEffect, useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { cn } from '@/lib/utils';

interface ContentAdvisoryOverlayProps {
    item: BaseItemDto | null;
    player?: any; // VideoJsPlayer instance
}

const ContentAdvisoryOverlay: React.FC<ContentAdvisoryOverlayProps> = ({ item, player }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasShown, setHasShown] = useState(false);

    useEffect(() => {
        if (!player || hasShown) return;

        const handleInactive = () => {
            if (!hasShown) {
                setHasShown(true);
                setIsVisible(true);
                
                // Netflix shows it for about 10 seconds
                setTimeout(() => {
                    setIsVisible(false);
                }, 10000);
            }
        };

        // check if it's already inactive
        if (player.userActive() === false) {
            handleInactive();
        } else {
            player.on('userinactive', handleInactive);
        }

        return () => {
            if (player) {
                player.off('userinactive', handleInactive);
            }
        };
    }, [player, hasShown]);

    if (!item) return null;

    const rating = item.OfficialRating;
    const tags = item.Tags || [];
    
    // Some libraries use genres for content warnings, but usually Tags are used.
    // If there's neither rating nor tags, don't show the overlay.
    if (!rating && tags.length === 0) return null;

    // Filter tags to likely content advisories (Netflix style "Violence", "Language", etc)
    // Here we'll just show up to 4 tags to keep it brief
    const displayTags = tags.slice(0, 4);

    return (
        <div
            className={cn(
                "absolute top-24 left-8 z-40 max-w-xs md:max-w-sm overflow-hidden pointer-events-none transition-all duration-1000 transform-gpu",
                isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            )}
        >
            <div className="flex border-l-[3px] border-l-white pl-3 py-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                <div className="flex flex-col justify-center gap-1">
                    <span className="font-bold text-white text-lg leading-none tracking-wide">
                        {rating || "Unrated"}
                    </span>
                    {displayTags.length > 0 && (
                        <p className="text-zinc-200 text-sm font-medium leading-none tracking-wide">
                            {displayTags.join(', ')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContentAdvisoryOverlay;
