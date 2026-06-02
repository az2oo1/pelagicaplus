import { Mic2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface LyricsButtonProps {
    active?: boolean;
    onClick: () => void;
    className?: string;
}

const LyricsButton = ({ active = false, onClick, className }: LyricsButtonProps) => {
    const { t } = useTranslation('player');

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                'cursor-pointer',
                active ? 'text-brand' : 'text-muted-foreground',
                className,
            )}
            onClick={onClick}
            aria-label={active ? t('hideLyrics') : t('showLyrics')}
            title={active ? t('hideLyrics') : t('showLyrics')}
        >
            <Mic2 />
        </Button>
    );
};

export default LyricsButton;
