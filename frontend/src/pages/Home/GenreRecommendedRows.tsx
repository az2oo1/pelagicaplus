import { useGenresWithItems } from '@/hooks/api/genres/useGenresWithItems';
import ItemsRow from './ItemsRow';
import LazyRow from '@/components/LazyRow';
import type { ItemSortBy } from '@jellyfin/sdk/lib/generated-client/models';

interface GenreRecommendedRowsProps {
    genreLimit?: number;
    limit?: number;
    mediaType?: 'Movie' | 'Series' | 'all';
    sortBy?: ItemSortBy[];
}

const GenreRecommendedRows = ({
    genreLimit = 5,
    limit = 10,
    mediaType = 'all',
    sortBy = ['CommunityRating' as ItemSortBy],
}: GenreRecommendedRowsProps) => {
    const { data: genres } = useGenresWithItems({ limit: 50 });

    if (!genres || genres.length === 0) return null;

    const types: ('Movie' | 'Series')[] =
        mediaType === 'Movie' ? ['Movie'] :
        mediaType === 'Series' ? ['Series'] :
        ['Movie', 'Series'];

    const topGenres = [...genres]
        .sort((a, b) => (b.item?.totalItems || 0) - (a.item?.totalItems || 0))
        .slice(0, genreLimit);

    return (
        <div className="flex flex-col gap-4">
            {topGenres.map((genre) => {
                const itemsConfig = {
                    genres: [genre.name],
                    limit,
                    types,
                    sortBy,
                    sortOrder: 'Descending' as const,
                };
                return (
                    <LazyRow key={genre.id} placeholderHeight="320px">
                        <ItemsRow
                            title={genre.name}
                            allLink={`/items?title=${encodeURIComponent(genre.name)}&config=${encodeURIComponent(JSON.stringify(itemsConfig))}`}
                            items={itemsConfig}
                            detailFields={['ReleaseYear']}
                        />
                    </LazyRow>
                );
            })}
        </div>
    );
};

export default GenreRecommendedRows;
