import { Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface LyricsButtonProps {
    active?: boolean;
    loading?: boolean;
    onClick: () => void;
    className?: string;
}

const LyricsButton = ({
    active = false,
    loading = false,
    onClick,
    className,
}: LyricsButtonProps) => {
    const { t } = useTranslation('player');

    const label = loading ? t('loadingLyrics') : active ? t('hideLyrics') : t('showLyrics');

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                'cursor-pointer',
                active ? 'text-primary' : 'text-muted-foreground',
                className
            )}
            onClick={onClick}
            disabled={loading}
            aria-label={label}
            aria-busy={loading}
            title={label}
        >
            {loading ? <Spinner /> : <Mic2 />}
        </Button>
    );
};

export default LyricsButton;
