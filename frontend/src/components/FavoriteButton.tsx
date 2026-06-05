import { Button } from '@/components/ui/button';
import { useFavorite } from '@/hooks/api/useFavorite';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
    item: BaseItemDto;
    showFavoriteButton?: boolean | undefined;
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

const FavoriteButton = ({
    item,
    showFavoriteButton,
    size = 'icon',
    variant = 'outline',
}: FavoriteButtonProps) => {
    const { isFavorite, toggleFavorite, isLoading: isFavoriteLoading } = useFavorite(item.Id);

    if (showFavoriteButton === false) return null;

    return (
        <Button
            variant={variant}
            size={size}
            onClick={() => toggleFavorite(!isFavorite)}
            disabled={isFavoriteLoading}
            className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
        >
            <Heart
                key={isFavorite ? 'favorite' : 'not-favorite'}
                className={cn(
                    'transition-colors duration-200 w-4 h-4',
                    isFavorite
                        ? 'animate-pop-in text-red-500 fill-red-500'
                        : 'text-muted-foreground hover:text-foreground'
                )}
            />
        </Button>
    );
};

export default FavoriteButton;
