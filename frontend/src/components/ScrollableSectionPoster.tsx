import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Link, useNavigate } from 'react-router';
import { Skeleton } from './ui/skeleton';
import { getPrimaryImageUrl, getDownloadurl } from '@/utils/jellyfinUrls';
import { useConfig } from '@/hooks/api/useConfig';
import WatchedStateBadge from './WatchedStateBadge';
import { useState, useRef } from 'react';
import { 
    ImageOff, Play, Film, Heart, Bookmark, Circle, CircleCheck, 
    Captions, Search, Link2, Image as ImageIcon, RotateCcw, 
    PencilLine, Trash2, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import GenreOverlay from './GenreOverlay';
import PosterPlayButton from './PosterPlayButton';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';

import { useFavorite } from '@/hooks/api/useFavorite';
import { useLike } from '@/hooks/api/useLike';
import { useItemPlayState } from '@/hooks/api/playState/useItemPlayState';
import { useMarkItemPlayed } from '@/hooks/api/playState/useMarkItemPlayed';
import { useMarkItemUnplayed } from '@/hooks/api/playState/useMarkItemUnplayed';
import { getUserId } from '@/utils/localstorageCredentials';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { toast } from 'sonner';
import { getApi } from '@/api/getApi';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getTvShowsApi } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Dialog components
import SubtitleDownloadDialog from '../pages/Item/SubtitleDownloadDialog';
import IdentifyDialog from './IdentifyDialog';
import ManageImageButton from './ManageImageButton';
import RefreshItemMetadataButton from './RefreshItemMetadataButton';
import EditItemMetadataButton from './EditItemMetadataButton';
import MediaDeleteButton from './MediaDeleteButton';

interface ScrollableSectionPosterProps {
    item?: BaseItemDto;
    posterUrl?: string;
    children?: React.ReactNode;
    itemName?: string;
    itemId?: string;
    className?: string;
    showGenres?: boolean;
    showPlayButton?: boolean;
}

const ScrollableSectionPoster = ({
    item,
    posterUrl,
    children,
    itemName,
    itemId,
    className,
    showGenres = false,
    showPlayButton = false,
}: ScrollableSectionPosterProps) => {
    const { config } = useConfig();
    const { loadQueue } = useMusicPlayback();
    const navigate = useNavigate();
    const [posterFailed, setPosterFailed] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    // Context Menu States
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuCoords, setMenuCoords] = useState({ x: 0, y: 0 });
    const [isPlayLoading, setIsPlayLoading] = useState(false);

    // Actions & User State Hooks
    const targetId = itemId || item?.Id || '';
    const userId = getUserId() || '';
    
    const { isFavorite, toggleFavorite, isLoading: isFavoriteLoading } = useFavorite(targetId);
    const { isLiked, toggleLike, isLoading: isLikeLoading } = useLike(targetId);
    const { data: playState } = useItemPlayState(targetId, userId);
    const { data: currentUser } = useCurrentUser();

    const markItemPlayed = useMarkItemPlayed();
    const markItemUnplayed = useMarkItemUnplayed();

    // Dialog refs
    const subtitlesTriggerRef = useRef<HTMLButtonElement>(null);
    const identifyTriggerRef = useRef<HTMLButtonElement>(null);
    const manageImagesTriggerRef = useRef<HTMLButtonElement>(null);
    const refreshMetadataTriggerRef = useRef<HTMLButtonElement>(null);
    const editMetadataTriggerRef = useRef<HTMLButtonElement>(null);
    const deleteTriggerRef = useRef<HTMLButtonElement>(null);
    const menuJustClosedRef = useRef(false);

    const togglePlayState = () => {
        if (!targetId) return;
        if (playState?.played) {
            markItemUnplayed.mutate({ itemId: targetId, userId });
        } else {
            markItemPlayed.mutate({ itemId: targetId, userId });
        }
    };

    const handleCopyStreamLink = () => {
        const streamUrl = getDownloadurl(targetId);
        if (streamUrl) {
            void navigator.clipboard.writeText(streamUrl).then(() => {
                toast.success('Stream link copied to clipboard!');
            }).catch((err) => {
                console.error('Failed to copy stream link:', err);
                toast.error('Could not copy stream link.');
            });
        } else {
            toast.error('Could not copy stream link.');
        }
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();
        setMenuCoords({ x: e.clientX, y: e.clientY });
        setMenuOpen(true);
    };

    const handlePlayClick = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const id = targetId;
        const type = item?.Type;
        if (!id || isPlayLoading) return;

        setIsPlayLoading(true);
        try {
            if (type === 'Series') {
                const api = getApi();
                const tvApi = getTvShowsApi(api);
                let episodeId: string | undefined;
                try {
                    const nextUpRes = await tvApi.getNextUp({
                        userId: userId || undefined,
                        seriesId: id,
                        limit: 1,
                        enableUserData: true,
                    });
                    episodeId = nextUpRes.data.Items?.[0]?.Id ?? undefined;
                } catch {
                    // ignore
                }

                if (!episodeId) {
                    const itemsApi = getItemsApi(api);
                    const episodesRes = await itemsApi.getItems({
                        parentId: id,
                        includeItemTypes: ['Episode'],
                        recursive: true,
                        sortBy: ['ParentIndexNumber', 'IndexNumber'],
                        sortOrder: ['Ascending'],
                        enableUserData: true,
                        limit: 1,
                    });
                    const allEpisodes = episodesRes.data.Items || [];
                    const target = allEpisodes.find(
                        (ep) => !ep.UserData?.Played || (ep.UserData?.PlaybackPositionTicks ?? 0) > 0
                    ) || allEpisodes[0];
                    episodeId = target?.Id ?? undefined;
                }

                if (episodeId) {
                    navigate(`/play/${episodeId}`);
                } else {
                    navigate(`/item/${id}`);
                }
                return;
            }

            if (type === 'MusicAlbum') {
                const api = getApi();
                const itemsApi = getItemsApi(api);
                const res = await itemsApi.getItems({
                    parentId: id,
                    includeItemTypes: ['Audio'],
                    sortBy: ['IndexNumber'],
                    sortOrder: ['Ascending'],
                    fields: ['Overview', 'MediaSources', 'MediaStreams'],
                    enableUserData: true,
                });
                const tracks = (res.data.Items || []).map((track) => ({
                    id: track.Id || '',
                    title: track.Name || '',
                    artist: track.ArtistItems?.[0]?.Name || item?.ArtistItems?.[0]?.Name || 'Unknown',
                    albumId: id,
                    albumName: item?.Name || '',
                }));
                if (tracks.length > 0) {
                    loadQueue(tracks, 0, true);
                }
                return;
            }

            if (type === 'Audio') {
                loadQueue([
                    {
                        id: id || '',
                        title: item?.Name || '',
                        artist: item?.AlbumArtist || item?.Artists?.[0] || 'Unknown',
                        albumId: item?.AlbumId || '',
                        albumName: item?.Album || '',
                    }
                ], 0, true);
                return;
            }

            navigate(`/play/${id}`);
        } catch (err) {
            console.error('Play click error:', err);
            navigate(`/item/${id}`);
        } finally {
            setIsPlayLoading(false);
        }
    };

    const canStream = item?.Type !== 'Series' && item?.Type !== 'Season' && item?.Type !== 'BoxSet' && item?.Type !== 'MusicArtist' && item?.Type !== 'Genre' && item?.Type !== 'Playlist';

    const isArtist = item?.Type === 'MusicArtist';
    const isSquareType =
        item?.Type === 'Playlist' ||
        item?.Type === 'MusicAlbum' ||
        item?.Type === 'Audio' ||
        isArtist;
    const posterClasses = isSquareType
        ? 'w-36 h-36 lg:w-44 lg:h-44 2xl:w-52 2xl:h-52'
        : 'w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80';
    const minPosterClasses = isSquareType
        ? 'min-w-36 lg:min-w-44 2xl:min-w-52 min-h-36 lg:min-h-44 2xl:min-h-52'
        : 'min-w-36 lg:min-w-44 2xl:min-w-52 min-h-54 lg:min-h-64 2xl:min-h-80';
    const skeletonClasses = isSquareType ? 'h-36 lg:h-44 2xl:h-52' : 'h-54 lg:h-64 2xl:h-80';
    const roundedClass = isArtist ? 'rounded-full' : 'rounded-md';

    const primaryImageTag = item?.ImageTags?.Primary;
    const targetImageId = item?.Type === 'Audio' && item.AlbumId ? item.AlbumId : (itemId || item?.Id || '');
    const targetImageTag = item?.Type === 'Audio' && item.AlbumId ? undefined : primaryImageTag;

    const handleClick = (e: React.MouseEvent) => {
        if (menuJustClosedRef.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        if (item?.Type === 'Audio') {
            e.preventDefault();
            loadQueue([
                {
                    id: itemId || item.Id || '',
                    title: itemName || item.Name || '',
                    artist: item.AlbumArtist || (item.Artists && item.Artists[0]) || 'Unknown',
                    albumId: item.AlbumId || '',
                    albumName: item.Album || '',
                }
            ], 0, true);
        }
    };

    if (posterFailed) {
        return (
            <Link
                to={`/item/${itemId || item?.Id}`}
                key={itemId || item?.Id}
                className={cn('group block outline-none focus:outline-none focus-visible:outline-none', className)}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onDragStart={(e) => e.preventDefault()}
            >
                <div
                    className={`relative overflow-hidden ${roundedClass} ${posterClasses} bg-muted flex items-center justify-center`}
                >
                    <ImageOff className="text-muted-foreground" size={32} />
                    <WatchedStateBadge
                        item={item}
                        show={config?.watchedStateBadgeHomeScreen || false}
                    />
                    <GenreOverlay item={item} show={showGenres && item?.Type !== 'Playlist' && item?.Type !== 'MusicAlbum' && item?.Type !== 'Audio'} />
                    {!isArtist && (
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    )}
                </div>
                <p
                    className={cn(
                        'mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52',
                        isArtist && 'text-center w-full'
                    )}
                >
                    {itemName || item?.Name || ''}
                </p>
                {children}
            </Link>
        );
    }

    return (
        <>
            <Link
                to={`/item/${itemId || item?.Id}`}
                key={itemId || item?.Id}
                className={cn('group block outline-none focus:outline-none focus-visible:outline-none', className)}
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                onDragStart={(e) => e.preventDefault()}
            >
                <div className={`relative overflow-hidden ${roundedClass} ${posterClasses}`}>
                    <img
                        key={itemId || item?.Id}
                        draggable={false}
                        src={
                            posterUrl
                                ? posterUrl
                                : getPrimaryImageUrl(
                                      targetImageId,
                                      { width: 400 },
                                      targetImageTag
                                  )
                        }
                        alt={itemName || item?.Name || ''}
                        className={cn(
                            minPosterClasses,
                            posterClasses,
                            'object-cover transform-gpu will-change-transform z-10',
                            roundedClass,
                            // Loading snap: no transition until image is ready, then hover effects are smooth
                            isImageLoaded
                                ? [
                                      'transition-[opacity,transform,scale] duration-[250ms] ease-out',
                                      'opacity-100 scale-100',
                                      'group-hover:opacity-90 group-hover:scale-105',
                                      'group-focus-within:opacity-90 group-focus-within:scale-105',
                                  ].join(' ')
                                : // While loading: blurred/dim, NO transition (instant snap on load)
                                  'opacity-40 scale-95 blur-sm'
                        )}
                        loading="lazy"
                        onLoad={() => setIsImageLoaded(true)}
                        onError={() => setPosterFailed(true)}
                    />
                    <Skeleton className={`absolute bottom-0 left-0 right-0 ${skeletonClasses} -z-1`} />
                    <WatchedStateBadge
                        item={item}
                        show={config?.watchedStateBadgeHomeScreen || false}
                    />
                    
                    {config?.showPosterTags !== false && (
                        <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1.5 z-30 pointer-events-none drop-shadow-md">
                            {item?.HasSubtitles && (
                                <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                    CC
                                </span>
                            )}
                            {item?.MediaSources?.[0]?.MediaStreams?.some(s => s.Type === 'Video' && s.Height && s.Height >= 720) && (
                                <span className="bg-black/70 backdrop-blur-sm text-brand font-bold text-[9px] px-1.5 py-0.5 rounded-[4px] border border-brand/30 uppercase tracking-wider">
                                    HD
                                </span>
                            )}
                            {item?.OfficialRating && (
                                <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                    {item.OfficialRating}
                                </span>
                            )}
                        </div>
                    )}
                    <GenreOverlay item={item} show={showGenres && item?.Type !== 'Playlist' && item?.Type !== 'MusicAlbum' && item?.Type !== 'Audio'} />
                    {!isArtist && (
                        <div className={`absolute inset-0 ${roundedClass} pointer-events-none poster-card-outline z-20`} />
                    )}

                    {showPlayButton && (
                        <PosterPlayButton item={item} itemId={itemId} />
                    )}
                </div>
                <p
                    className={cn(
                        'mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52',
                        isArtist && 'text-center w-full'
                    )}
                >
                    {itemName || item?.Name || ''}
                </p>
                {children}
            </Link>

            {menuOpen && item && (
                <DropdownMenu
                    open={menuOpen}
                    onOpenChange={(open) => {
                        setMenuOpen(open);
                        if (!open) {
                            menuJustClosedRef.current = true;
                            setTimeout(() => {
                                menuJustClosedRef.current = false;
                            }, 300);
                        }
                    }}
                >
                    <DropdownMenuTrigger asChild>
                        <div
                            style={{
                                position: 'fixed',
                                left: menuCoords.x,
                                top: menuCoords.y,
                                width: 1,
                                height: 1,
                                pointerEvents: 'none',
                                zIndex: 100
                            }}
                        />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                        align="start" 
                        className="w-56 z-50"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                    >
                        {/* Play Action */}
                        <DropdownMenuItem onClick={handlePlayClick} disabled={isPlayLoading}>
                            {isPlayLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            <span>Play</span>
                        </DropdownMenuItem>

                        {/* Trailer Action */}
                        {item.RemoteTrailers && item.RemoteTrailers.length > 0 && item.RemoteTrailers[0].Url && (
                            <DropdownMenuItem asChild>
                                <a
                                    href={item.RemoteTrailers[0].Url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 w-full"
                                >
                                    <Film className="w-4 h-4" />
                                    <span>Trailer</span>
                                </a>
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {/* Favorite Action */}
                        <DropdownMenuItem onClick={() => toggleFavorite(!isFavorite)} disabled={isFavoriteLoading}>
                            <Heart className={cn("w-4 h-4", isFavorite && "fill-red-500 text-red-500")} />
                            <span>{isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                        </DropdownMenuItem>

                        {/* Watchlist Action */}
                        <DropdownMenuItem onClick={() => toggleLike(!isLiked)} disabled={isLikeLoading}>
                            <Bookmark className={cn("w-4 h-4", isLiked && "fill-amber-500 text-amber-500")} />
                            <span>{isLiked ? 'Remove Watchlist' : 'Add Watchlist'}</span>
                        </DropdownMenuItem>

                        {/* Played State Action */}
                        {item.Type !== 'MusicArtist' && item.Type !== 'Genre' && (
                            <DropdownMenuItem onClick={togglePlayState}>
                                {playState?.played ? <CircleCheck className="w-4 h-4 text-green-500 fill-green-500/10" /> : <Circle className="w-4 h-4" />}
                                <span>{playState?.played ? 'Mark Unplayed' : 'Mark Played'}</span>
                            </DropdownMenuItem>
                        )}

                        {/* Admin Section */}
                        {currentUser?.Policy?.IsAdministrator && (
                            <>
                                <DropdownMenuSeparator />
                                
                                {item.Type === 'Movie' || item.Type === 'Series' || item.Type === 'Episode' ? (
                                    <DropdownMenuItem onClick={() => subtitlesTriggerRef.current?.click()}>
                                        <Captions className="w-4 h-4" />
                                        <span>Subtitles</span>
                                    </DropdownMenuItem>
                                ) : null}

                                {(item.Type === 'Movie' || item.Type === 'Series') && (
                                    <DropdownMenuItem onClick={() => identifyTriggerRef.current?.click()}>
                                        <Search className="w-4 h-4" />
                                        <span>Identify</span>
                                    </DropdownMenuItem>
                                )}

                                {canStream && (
                                    <DropdownMenuItem onClick={handleCopyStreamLink}>
                                        <Link2 className="w-4 h-4" />
                                        <span>Copy Stream Link</span>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => manageImagesTriggerRef.current?.click()}>
                                    <ImageIcon className="w-4 h-4" />
                                    <span>Manage Images</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => refreshMetadataTriggerRef.current?.click()}>
                                    <RotateCcw className="w-4 h-4" />
                                    <span>Refresh Metadata</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => editMetadataTriggerRef.current?.click()}>
                                    <PencilLine className="w-4 h-4" />
                                    <span>Edit Metadata</span>
                                </DropdownMenuItem>

                                <DropdownMenuItem onClick={() => deleteTriggerRef.current?.click()} variant="destructive">
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Hidden triggers for Admin dialogs */}
            {currentUser?.Policy?.IsAdministrator && item && (
                <div style={{ display: 'none' }}>
                    <SubtitleDownloadDialog
                        item={item}
                        trigger={<button ref={subtitlesTriggerRef} />}
                    />
                    {(item.Type === 'Movie' || item.Type === 'Series') && (
                        <IdentifyDialog
                            item={item}
                            trigger={<button ref={identifyTriggerRef} />}
                        />
                    )}
                    <ManageImageButton item={item} trigger={<button ref={manageImagesTriggerRef} />} />
                    <RefreshItemMetadataButton
                        item={item}
                        trigger={<button ref={refreshMetadataTriggerRef} />}
                    />
                    <EditItemMetadataButton
                        item={item}
                        trigger={<button ref={editMetadataTriggerRef} />}
                    />
                    <MediaDeleteButton item={item} trigger={<button ref={deleteTriggerRef} />} />
                </div>
            )}
        </>
    );
};
export default ScrollableSectionPoster;
