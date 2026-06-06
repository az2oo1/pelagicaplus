import { Skeleton } from '@/components/ui/skeleton';
import { useConfig } from '@/hooks/api/useConfig';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { TFunction } from 'i18next';
import { ImageOff, Film, Tv } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import { cn } from '@/lib/utils';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';

const LibraryItem = ({
    item,
    posterUrl,
    t,
    posterAspectRatio = '2/3',
    detailLine,
    overlay,
}: {
    item: BaseItemDto;
    posterUrl: string;
    t: TFunction;
    posterAspectRatio?: string;
    detailLine?: React.ReactNode;
    overlay?: React.ReactNode;
}) => {
    const { config } = useConfig();
    const { loadQueue } = useMusicPlayback();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        if (item.Type === 'Audio') {
            e.preventDefault();
            loadQueue([
                {
                    id: item.Id || '',
                    title: item.Name || '',
                    artist: item.AlbumArtist || (item.Artists && item.Artists[0]) || 'Unknown',
                    albumId: item.AlbumId || '',
                    albumName: item.Album || '',
                }
            ], 0, true);
        }
    };

    const aspectClass = posterAspectRatio === 'square' ? 'aspect-square' : 'aspect-[2/3]';

    return (
        <Link
            to={`/item/${item.Id}`}
            key={item.Id}
            className="p-0 m-0"
            onClick={handleClick}
        >
            <div
                className={cn("relative w-full overflow-hidden rounded-md group", aspectClass)}
            >
                {!posterError ? (
                    <>
                        <img
                            key={item.Id}
                            src={posterUrl}
                            alt={item.Name || t('library:no_title')}
                            className={cn(
                                'w-full h-full object-cover rounded-md transform-gpu will-change-transform z-10 poster-image',
                                isImageLoaded
                                    ? 'blur-0 opacity-100 scale-100'
                                    : 'blur-md opacity-40 scale-95',
                                isImageLoaded && 'group-hover:opacity-90 group-hover:scale-105'
                            )}
                            loading="lazy"
                            onLoad={() => setIsImageLoaded(true)}
                            onError={() => setPosterError(true)}
                        />
                        <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </>
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                        <ImageOff className="text-4xl text-muted-foreground" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </div>
                )}
                <WatchedStateBadge item={item} show={config?.watchedStateBadgeLibrary || false} />
                
                {config?.showPosterTags !== false && (
                    <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1.5 z-30 pointer-events-none drop-shadow-md">
                        {item.HasSubtitles && (
                            <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                CC
                            </span>
                        )}
                        {item.MediaSources?.[0]?.MediaStreams?.some(s => s.Type === 'Video' && s.Height && s.Height >= 720) && (
                            <span className="bg-black/70 backdrop-blur-sm text-brand font-bold text-[9px] px-1.5 py-0.5 rounded-[4px] border border-brand/30 uppercase tracking-wider">
                                HD
                            </span>
                        )}
                        {item.OfficialRating && (
                            <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                {item.OfficialRating}
                            </span>
                        )}
                    </div>
                )}
                {overlay}
            </div>
            <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                {item.Name || t('library:no_title')}
            </p>
            <div className="flex flex-wrap items-center mt-0.5">
                <span className="text-xs text-muted-foreground mr-3 line-clamp-1 flex items-center gap-1">
                    {item.Type === 'Movie' && <Film className="w-3.5 h-3.5 shrink-0" />}
                    {item.Type === 'Series' && <Tv className="w-3.5 h-3.5 shrink-0" />}
                    {detailLine && <span>{detailLine}</span>}
                </span>
            </div>
        </Link>
    );
};

export default LibraryItem;
