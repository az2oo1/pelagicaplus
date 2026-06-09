import SectionScroller from '@/components/SectionScroller';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrailerItems } from '@/hooks/api/useTrailerItems';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';

interface TrailerCardProps {
    item: BaseItemDto;
    trailerUrl: string;
}

const TrailerCard = ({ item, trailerUrl }: TrailerCardProps) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const posterUrl = getPrimaryImageUrl(item.Id!, undefined, item.ImageTags?.Primary);
    const year = item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : null;

    return (
        <div className="relative group w-36 lg:w-44 2xl:w-52">
            <Link to={`/item/${item.Id}`} className="block">
                <div className="relative w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80 rounded-md overflow-hidden">
                    {!imageLoaded && <Skeleton className="absolute inset-0 rounded-md" />}
                    <img
                        src={`${posterUrl}&maxWidth=416&maxHeight=640&quality=85`}
                        alt={item.Name || ''}
                        className={`w-full h-full object-cover rounded-md transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="lazy"
                        onLoad={() => setImageLoaded(true)}
                    />
                    <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-10" />
                </div>
            </Link>

            {/* YouTube play button — centered over poster */}
            <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                onClick={e => e.stopPropagation()}
                title={item.Name || ''}
            >
                <div className="bg-red-600 rounded-full p-3 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-xl">
                    <Play className="text-white w-6 h-6" fill="white" />
                </div>
            </a>

            <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52">
                {item.Name}
            </p>
            <a
                href={trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-400 transition-colors mt-0.5 w-fit"
                onClick={e => e.stopPropagation()}
            >
                <Play className="w-3 h-3" fill="currentColor" />
                Trailer{year ? ` · ${year}` : ''}
            </a>
        </div>
    );
};

interface TrailersRowProps {
    title?: string;
    limit?: number;
    types?: ('Movie' | 'Series')[];
}

const TrailersRow = ({ title, limit = 20, types = ['Movie'] }: TrailersRowProps) => {
    const { t } = useTranslation('home');
    const { data: items, isLoading } = useTrailerItems({ limit, types });

    if (!isLoading && (!items || items.length === 0)) return null;

    return (
        <SectionScroller
            className="max-w-full"
            title={<h2 className="text-2xl font-bold flex items-center gap-2">{title ?? t('trailers')}</h2>}
            items={
                items
                    ? items.map(item => (
                          <TrailerCard
                              key={item.Id}
                              item={item}
                              trailerUrl={item.RemoteTrailers?.[0]?.Url || ''}
                          />
                      ))
                    : Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="w-36 lg:w-44 2xl:w-52">
                              <Skeleton className="w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80 rounded-md mb-2" />
                              <Skeleton className="w-32 lg:w-40 2xl:w-48 h-4 mb-1" />
                              <Skeleton className="w-20 lg:w-24 2xl:w-28 h-3" />
                          </div>
                      ))
            }
            contentInset={true}
        />
    );
};

export default TrailersRow;
