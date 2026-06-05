import { Button } from '@/components/ui/button';
import { useLike } from '@/hooks/api/useLike';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WatchlistButtonProps {
    item: BaseItemDto;
    showWatchlistButton?: boolean | undefined;
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg' | null | undefined;
    variant?:
        | 'default'
        | 'link'
        | 'destructive'
        | 'outline'
        | 'secondary'
        | 'ghost'
        | null
        | undefined;
}

const WatchListButton = ({
    item,
    showWatchlistButton,
    size = 'icon',
    variant = 'outline',
}: WatchlistButtonProps) => {
    const { isLiked, toggleLike, isLoading } = useLike(item.Id);

    if (showWatchlistButton === false) return null;

    return (
        <Button
            variant={variant}
            size={size}
            onClick={() => toggleLike(!isLiked)}
            disabled={isLoading}
            className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
        >
            <Bookmark
                key={isLiked ? 'liked' : 'not-liked'}
                className={cn(
                    'transition-colors duration-200 w-4 h-4',
                    isLiked
                        ? 'animate-pop-in text-amber-500 fill-amber-500'
                        : 'text-muted-foreground hover:text-foreground'
                )}
            />
        </Button>
    );
};

export default WatchListButton;
