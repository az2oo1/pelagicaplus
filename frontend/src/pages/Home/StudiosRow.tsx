import SectionScroller from '@/components/SectionScroller';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useStudiosByItemCount } from '../../hooks/api/useStudiosApi';
import { cn } from '@/lib/utils';

interface StudiosRowProps {
    title?: string;
    limit?: number;
}

export const StudioDisplay = ({
    item,
}: {
    item: {
        id: string;
        name: string;
        count: number;
    };
}) => {
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <Link
            to={`/studio/${item.id}?name=${encodeURIComponent(item.name)}`}
            key={item.id}
            className={'group w-min min-w-36 lg:min-w-48 2xl:min-w-64'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                <img
                    src={`/api/studios/search/logo?name=${encodeURIComponent(item.name)}`}
                    alt={item.name || 'No Name'}
                    className={cn(
                        'absolute inset-0 w-full h-full object-contain p-4 transform-gpu will-change-transform z-10 poster-image transition-all duration-500',
                        isImageLoaded
                            ? 'blur-0 opacity-100 scale-100'
                            : 'blur-md opacity-0 scale-95',
                        isImageLoaded && isHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
                    )}
                    onLoad={() => setIsImageLoaded(true)}
                />
                {!isImageLoaded && <Skeleton className="absolute inset-0 -z-1" />}
                <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-40" />
                
                {isHovered && (
                    <video
                        src={`/api/studios/search/video?name=${encodeURIComponent(item.name)}`}
                        className="absolute inset-0 w-full h-full object-cover z-30 pointer-events-none transition-opacity duration-500 animate-in fade-in zoom-in-95"
                        autoPlay
                        loop
                        muted
                        playsInline
                    />
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
            title={
                <Link to="/studios" className="flex items-center gap-1 group cursor-pointer w-fit hover:text-primary transition-colors">
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <ChevronRight className="w-7 h-7 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
            }
            items={
                studios
                    ? studios.map((studio) => <StudioDisplay item={studio} key={studio.id} />)
                    : Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="w-min min-w-36 lg:min-w-48 2xl:min-w-64">
                              <Skeleton className="w-full aspect-video rounded-md" />
                          </div>
                      ))
            }
            contentInset={true}
        />
    );
};

export default StudiosRow;
