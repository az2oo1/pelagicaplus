import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Page from '../Page';
import { useUserViews } from '@/hooks/api/useUserViews';
import { useMemo, useState, useEffect } from 'react';
import { useLibraryItems } from '@/hooks/api/useLibraryItems';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import ItemPagination from '@/components/ItemPagination';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWideIcon,
    Calendar,
    CalendarPlus,
    CaseSensitive,
    Clock,
    FolderOpen,
    Star,
    Shuffle,
    Award,
    History,
    Shield,
    Play,
} from 'lucide-react';
import JellyfinLibraryIcon from '@/components/JellyfinLibraryIcon';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';
import { ButtonGroup } from '@/components/ui/button-group';
import LibraryItem from './LibraryItem';
import { SUPPORTED_LIBRARY_COLLECTION_TYPES } from '@/utils/supportedLibraryCollectionTypes';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';

const ITEM_ROWS = 5;

function getColumnCount(width: number): number {
    if (width >= 1536) return 9; // 2xl
    if (width >= 1280) return 7; // xl
    if (width >= 1024) return 5; // lg
    if (width >= 768) return 4; // md
    if (width >= 640) return 3; // sm
    return 2;
}

const LibraryContent = ({
    libraryId,
    collectionType,
    sortBy,
    sortOrder,
    itemTypeFilter,
    page,
    onPageChange,
}: {
    libraryId: string;
    collectionType?: string;
    sortBy: ItemSortBy;
    sortOrder: SortOrder;
    itemTypeFilter: string;
    page: number;
    onPageChange: (p: number) => void;
}) => {
    const { t } = useTranslation(['library', 'common']);
    const [pageSize, setPageSize] = useState(
        () => getColumnCount(typeof window !== 'undefined' ? window.innerWidth : 640) * ITEM_ROWS
    );

    useEffect(() => {
        const handleResize = () => {
            const newPageSize = getColumnCount(window.innerWidth) * ITEM_ROWS;
            setPageSize(newPageSize);
            onPageChange(0);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [onPageChange]);

    const isMusicLibrary = collectionType === 'music';
    const includeItemTypes = isMusicLibrary
        ? itemTypeFilter === 'all'
            ? (['MusicAlbum', 'Audio', 'MusicArtist'] as const)
            : ([itemTypeFilter] as unknown as ('MusicAlbum' | 'Audio' | 'MusicArtist')[])
        : (['Series', 'Movie', 'BoxSet', 'MusicAlbum'] as const);

    const { data: libraryData, isLoading } = useLibraryItems(libraryId, {
        limit: pageSize,
        startIndex: page * pageSize,
        includeItemTypes: [...includeItemTypes],
        sortBy: [sortBy],
        sortOrder,
    });

    const [wasLoading, setWasLoading] = useState(isLoading);
    useEffect(() => {
        if (wasLoading && !isLoading) {
            const activeEl = document.activeElement;
            if (!activeEl || activeEl === document.body || activeEl.id === 'loading-skeleton-container') {
                setTimeout(() => {
                    const firstItem = document.querySelector('.library-item-link') as HTMLElement;
                    if (firstItem) {
                        firstItem.focus({ preventScroll: true });
                    }
                }, 50);
            }
        }
        setWasLoading(isLoading);
    }, [isLoading, wasLoading]);

    const posterUrls = useMemo(() => {
        if (!libraryData) return {};
        return libraryData.items.reduce(
            (acc, item) => {
                const isSquare =
                    item.Type === 'MusicAlbum' ||
                    item.Type === 'Audio' ||
                    item.Type === 'MusicArtist';
                const targetImageId =
                    item.Type === 'Audio' && item.AlbumId ? item.AlbumId : item.Id!;
                const targetImageTag =
                    item.Type === 'Audio' && item.AlbumId ? undefined : item.ImageTags?.Primary;

                acc[item.Id!] = getPrimaryImageUrl(
                    targetImageId,
                    isSquare
                        ? {
                              height: 416,
                              width: 416,
                          }
                        : {
                              height: 640,
                              width: 416,
                          },
                    targetImageTag
                );
                return acc;
            },
            {} as Record<string, string>
        );
    }, [libraryData]);

    const totalPages = libraryData?.totalCount ? Math.ceil(libraryData.totalCount / pageSize) : 0;

    return (
        <div className="mb-4">
            {isLoading && (
                <div
                    tabIndex={0}
                    id="loading-skeleton-container"
                    className="w-full gap-4 mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md animate-pulse"
                >
                    {Array.from({ length: pageSize }).map((_, i) => (
                        <div key={i} className="p-0 m-0">
                            <div className="relative w-full aspect-[2/3] overflow-hidden rounded-md">
                                <Skeleton className="w-full h-full" />
                            </div>
                            <Skeleton className="mt-2 h-4 w-3/4" />
                            <Skeleton className="mt-1 h-3 w-1/4" />
                        </div>
                    ))}
                </div>
            )}
            {!isLoading && libraryData && !libraryData.items?.length && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FolderOpen />
                        </EmptyMedia>
                        <EmptyTitle>{t('library:no_items_title')}</EmptyTitle>
                        <EmptyDescription>{t('library:no_items_description')}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            {!isLoading && libraryData && libraryData.items && libraryData.items.length > 0 && (
                <>
                    <div className="w-full gap-4 mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
                        {libraryData.items.map((item) => (
                            <LibraryItem
                                key={item.Id}
                                item={item}
                                posterUrl={posterUrls[item.Id!]}
                                t={t}
                                posterAspectRatio={
                                    item.Type === 'MusicAlbum' ||
                                    item.Type === 'Audio' ||
                                    item.Type === 'MusicArtist'
                                        ? 'square'
                                        : '2/3'
                                }
                                detailLine={
                                    item.Type === 'MusicAlbum' || item.Type === 'Audio'
                                        ? item.AlbumArtist || (item.Artists && item.Artists[0])
                                        : item.PremiereDate
                                          ? new Date(item.PremiereDate).getFullYear()
                                          : undefined
                                }
                            />
                        ))}
                    </div>
                    <ItemPagination
                        totalPages={totalPages}
                        currentPage={page}
                        onPageChange={onPageChange}
                    />
                </>
            )}
        </div>
    );
};

const LibraryPage = () => {
    const { t } = useTranslation('library');
    const { data: libraries } = useUserViews();
    const [searchParams, setSearchParams] = useSearchParams();

    const sortByParam = useMemo(() => {
        const urlParam = searchParams.get('sortBy');
        if (urlParam) {
            if (urlParam === 'DateLastPlayed') return 'DatePlayed' as ItemSortBy;
            return urlParam as ItemSortBy;
        }
        if (typeof window !== 'undefined') {
            const saved = (localStorage.getItem('pelagica_library_sort_by') as ItemSortBy) || 'Name';
            if (saved as string === 'DateLastPlayed') return 'DatePlayed' as ItemSortBy;
            return saved;
        }
        return 'Name';
    }, [searchParams]);

    const sortOrderParam = useMemo(() => {
        const urlParam = searchParams.get('sortOrder');
        if (urlParam) return urlParam as SortOrder;
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pelagica_library_sort_order') as SortOrder) || 'Ascending';
        }
        return 'Ascending';
    }, [searchParams]);

    const [sortBy, setSortBy] = useState<ItemSortBy>(sortByParam);
    const [sortOrder, setSortOrder] = useState<SortOrder>(sortOrderParam);

    useEffect(() => {
        setSortBy(sortByParam);
    }, [sortByParam]);

    useEffect(() => {
        setSortOrder(sortOrderParam);
    }, [sortOrderParam]);

    const pageParam = parseInt(searchParams.get('page') ?? '0', 10);
    const [page, setPage] = useState<number>(Number.isNaN(pageParam) ? 0 : pageParam);

    const firstLibraryId = libraries?.Items?.[0]?.Id ?? '';
    const libraryIdFromUrl = searchParams.get('library') || '';
    const activeLibraryId =
        libraryIdFromUrl && libraries?.Items?.some((library) => library.Id === libraryIdFromUrl)
            ? libraryIdFromUrl
            : firstLibraryId;

    const activeLibrary = libraries?.Items?.find((library) => library.Id === activeLibraryId);
    const isMusicLibrary = activeLibrary?.CollectionType === 'music';

    const itemTypeParam = useMemo(() => {
        const urlParam = searchParams.get('itemType');
        if (urlParam) return urlParam;
        if (isMusicLibrary && typeof window !== 'undefined') {
            return localStorage.getItem('pelagica_library_item_type_filter') || 'all';
        }
        return 'all';
    }, [searchParams, isMusicLibrary]);

    const [itemType, setItemType] = useState<string>(itemTypeParam);

    useEffect(() => {
        setItemType(itemTypeParam);
    }, [itemTypeParam]);

    const handleLibraryChange = (libraryId: string) => {
        setPage(0);
        const nextLibrary = libraries?.Items?.find((library) => library.Id === libraryId);
        const nextIsMusic = nextLibrary?.CollectionType === 'music';
        const savedType = nextIsMusic && typeof window !== 'undefined'
            ? localStorage.getItem('pelagica_library_item_type_filter') || 'all'
            : 'all';
        setItemType(savedType);

        let savedSortBy = typeof window !== 'undefined'
            ? (localStorage.getItem('pelagica_library_sort_by') as ItemSortBy) || 'Name'
            : 'Name';

        if (savedSortBy as string === 'DateLastPlayed') {
            savedSortBy = 'DatePlayed';
        }

        // Validate sorting selection for the new library type to prevent illegal state
        const movieOnlySorts = ['CommunityRating', 'CriticRating', 'OfficialRating', 'PremiereDate'];
        const musicOnlySorts = ['Artist', 'AlbumArtist', 'ProductionYear'];

        if (nextIsMusic && movieOnlySorts.includes(savedSortBy)) {
            savedSortBy = 'Name';
            if (typeof window !== 'undefined') {
                localStorage.setItem('pelagica_library_sort_by', 'Name');
            }
        } else if (!nextIsMusic && musicOnlySorts.includes(savedSortBy)) {
            savedSortBy = 'Name';
            if (typeof window !== 'undefined') {
                localStorage.setItem('pelagica_library_sort_by', 'Name');
            }
        }

        const savedSortOrder = typeof window !== 'undefined'
            ? (localStorage.getItem('pelagica_library_sort_order') as SortOrder) || 'Ascending'
            : 'Ascending';

        setSortBy(savedSortBy);
        setSortOrder(savedSortOrder);

        const params: Record<string, string> = {
            library: libraryId,
            page: '0',
            sortBy: savedSortBy,
            sortOrder: savedSortOrder,
        };
        if (savedType !== 'all') {
            params.itemType = savedType;
        }
        setSearchParams(params);
    };

    const libraryItems = libraries?.Items?.filter((library) =>
        SUPPORTED_LIBRARY_COLLECTION_TYPES.includes(library.CollectionType!)
    );

    useEffect(() => {
        const params: Record<string, string> = {
            library: activeLibraryId,
            page: String(page),
            sortBy,
            sortOrder,
        };
        if (itemType !== 'all') {
            params.itemType = itemType;
        }
        setSearchParams(params);
    }, [activeLibraryId, page, sortBy, sortOrder, itemType, setSearchParams]);

    return (
        <Page title={t('title')} requiresAuth className="flex-1">
            <Tabs
                value={activeLibraryId}
                onValueChange={handleLibraryChange}
                className="w-full"
                activationMode="automatic"
            >
                <div className="flex flex-col sm:items-center sm:justify-between sm:flex-row gap-2">
                    <TabsList className="max-w-full overflow-auto">
                        {libraryItems?.map((library) => (
                            <TabsTrigger key={library.Id} value={library.Id ?? ''}>
                                <JellyfinLibraryIcon libraryType={library.CollectionType} />
                                {library.Name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <ButtonGroup>
                        {isMusicLibrary && (
                            <Select
                                onValueChange={(value) => {
                                    setItemType(value);
                                    setPage(0);
                                    localStorage.setItem('pelagica_library_item_type_filter', value);
                                }}
                                value={itemType}
                            >
                                <SelectTrigger size="sm" onKeyDown={(e) => {
                                    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('type_all', { defaultValue: 'All Types' })}
                                    </SelectItem>
                                    <SelectItem value="MusicAlbum">
                                        {t('type_albums', { defaultValue: 'Albums' })}
                                    </SelectItem>
                                    <SelectItem value="Audio">
                                        {t('type_songs', { defaultValue: 'Songs' })}
                                    </SelectItem>
                                    <SelectItem value="MusicArtist">
                                        {t('type_artists', { defaultValue: 'Artists' })}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Select
                            onValueChange={(value) => {
                                const nextSortBy = value as ItemSortBy;
                                setSortBy(nextSortBy);
                                setPage(0);
                                localStorage.setItem('pelagica_library_sort_by', nextSortBy);
                            }}
                            value={sortBy}
                        >
                            <SelectTrigger size="sm" onKeyDown={(e) => {
                                if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}>
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Name">
                                    <CaseSensitive />
                                    {t('sort_name')}
                                </SelectItem>
                                <SelectItem value="Random">
                                    <Shuffle />
                                    {t('sort_random')}
                                </SelectItem>
                                {!isMusicLibrary && (
                                    <>
                                        <SelectItem value="CommunityRating">
                                            <Star />
                                            {t('sort_community_rating')}
                                        </SelectItem>
                                        <SelectItem value="CriticRating">
                                            <Award />
                                            {t('sort_critic_rating')}
                                        </SelectItem>
                                        <SelectItem value="OfficialRating">
                                            <Shield />
                                            {t('sort_parental_rating')}
                                        </SelectItem>
                                        <SelectItem value="PremiereDate">
                                            <Calendar />
                                            {t('sort_premiere_date')}
                                        </SelectItem>
                                    </>
                                )}
                                {isMusicLibrary && (
                                    <>
                                        <SelectItem value="Artist">
                                            <CaseSensitive />
                                            {t('sort_artist', { defaultValue: 'Artist' })}
                                        </SelectItem>
                                        <SelectItem value="AlbumArtist">
                                            <CaseSensitive />
                                            {t('sort_album_artist', { defaultValue: 'Album Artist' })}
                                        </SelectItem>
                                        <SelectItem value="ProductionYear">
                                            <Calendar />
                                            {t('sort_release_date', { defaultValue: 'Release Date' })}
                                        </SelectItem>
                                    </>
                                )}
                                <SelectItem value="DateCreated">
                                    <CalendarPlus />
                                    {t('sort_date_added')}
                                </SelectItem>
                                <SelectItem value="DatePlayed">
                                    <History />
                                    {t('sort_date_played')}
                                </SelectItem>
                                <SelectItem value="PlayCount">
                                    <Play />
                                    {t('sort_play_count')}
                                </SelectItem>
                                <SelectItem value="Runtime">
                                    <Clock />
                                    {t('sort_runtime')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            onValueChange={(value) => {
                                const nextSortOrder = value as SortOrder;
                                setSortOrder(nextSortOrder);
                                setPage(0);
                                localStorage.setItem('pelagica_library_sort_order', nextSortOrder);
                            }}
                            value={sortOrder}
                        >
                            <SelectTrigger size="sm" onKeyDown={(e) => {
                                if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}>
                                <SelectValue placeholder="Order" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ascending">
                                    <ArrowUpNarrowWideIcon />
                                    {t('ascending')}
                                </SelectItem>
                                <SelectItem value="Descending">
                                    <ArrowDownWideNarrow />
                                    {t('descending')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </ButtonGroup>
                </div>
                {libraryItems?.map((library) => {
                    if (!library.Id) return null;

                    return (
                        <TabsContent key={library.Id} value={library.Id ?? ''}>
                            <LibraryContent
                                key={`${library.Id}-${sortBy}-${sortOrder}-${itemType}`}
                                libraryId={library.Id}
                                collectionType={library.CollectionType ?? undefined}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                itemTypeFilter={itemType}
                                page={page}
                                onPageChange={setPage}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </Page>
    );
};

export default LibraryPage;
