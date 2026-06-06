import type { SeerrResult } from '@/hooks/api/useSeerrSearch';
import SeerrItem from '@/components/SeerrItem';

interface SeerrGridProps {
    items: SeerrResult[];
}

const SeerrGrid = ({ items }: SeerrGridProps) => (
    <div className="w-full gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
        {items.map((item) => (
            <SeerrItem key={`${item.mediaType}-${item.id}`} item={item} />
        ))}
    </div>
);

export default SeerrGrid;
