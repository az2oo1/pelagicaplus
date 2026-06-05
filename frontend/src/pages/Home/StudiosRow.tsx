import SectionScroller from '@/components/SectionScroller';
import { Skeleton } from '@/components/ui/skeleton';
import { getStudioImageUrl } from '@/utils/jellyfinUrls';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useStudiosByItemCount } from '../../hooks/api/useStudiosApi';
import { cn } from '@/lib/utils';

interface StudiosRowProps {
    title?: string;
    limit?: number;
}

const StudioDisplay = ({
    item,
}: {
    item: {
        id: string;
        name: string;
        count: number;
    };
}) => {
    const [imageError, setImageError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    return (
        <Link
            to={`/studio/${item.id}?name=${encodeURIComponent(item.name)}`}
            key={item.id}
            className={'group w-min min-w-48 lg:min-w-64 2xl:min-w-80'}
        >
            <div className="relative w-full aspect-video rounded-md overflow-hidden">
                {imageError ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                        <ImageOff className="w-12 h-12 text-muted-foreground" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </div>
                ) : (
                    <>
                        <img
                            src={getStudioImageUrl(item.name)}
                            alt={item.name || 'No Name'}
                            className={cn(
                                'w-full h-full object-cover rounded-md transform-gpu will-change-transform z-10 poster-image',
                                isImageLoaded
                                    ? 'blur-0 opacity-100 scale-100'
                                    : 'blur-md opacity-40 scale-95',
                                isImageLoaded && 'group-hover:opacity-90 group-hover:scale-105'
                            )}
                            onLoad={() => setIsImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                        <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </>
                )}
            </div>
        </Link>
    );
};

const StudiosRow = ({ title, limit }: StudiosRowProps) => {
    const { data: studios, isLoading } = useStudiosByItemCount(limit);

    if ((!studios || studios.length === 0) && !isLoading) {
        return null;
    }

    return (
        <SectionScroller
            className="max-w-full"
            title={<h2 className="text-2xl font-bold flex items-center gap-2">{title}</h2>}
            items={
                studios
                    ? studios.map((studio) => <StudioDisplay item={studio} key={studio.id} />)
                    : Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="w-min min-w-48 lg:min-w-64 2xl:min-w-80">
                              <Skeleton className="w-full aspect-video rounded-md" />
                          </div>
                      ))
            }
            contentInset={true}
        />
    );
};

export default StudiosRow;
