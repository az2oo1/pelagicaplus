import { useState } from 'react';
import { useNavigate } from 'react-router';
import ItemsRow from './ItemsRow';

interface Mood {
    emoji: string;
    label: string;
    genres: string[];
    tags?: string[];
    types?: ('Movie' | 'Series')[];
}

const MOODS: Mood[] = [
    {
        emoji: '😂',
        label: 'Lachen',
        genres: ['Comedy', 'Komödie'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '😱',
        label: 'Gruseln',
        genres: ['Horror', 'Thriller'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '🔥',
        label: 'Action',
        genres: ['Action', 'Adventure', 'Abenteuer'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '🧠',
        label: 'Doku',
        genres: ['Documentary', 'Dokumentarfilm'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '❤️',
        label: 'Romantik',
        genres: ['Romance', 'Romanze'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '🚀',
        label: 'Sci-Fi',
        genres: ['Science Fiction', 'Sci-Fi & Fantasy'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '😢',
        label: 'Zum Weinen',
        genres: ['Drama'],
        types: ['Movie', 'Series'],
    },
    {
        emoji: '🧩',
        label: 'Krimi',
        genres: ['Crime', 'Mystery', 'Krimi'],
        types: ['Movie', 'Series'],
    },
];

interface MoodBarProps {
    title?: string;
    limit?: number;
}

const MoodBar = ({ title, limit = 20 }: MoodBarProps) => {
    const [activeMood, setActiveMood] = useState<Mood | null>(null);

    const handleMoodClick = (mood: Mood) => {
        setActiveMood((prev) => (prev?.label === mood.label ? null : mood));
    };

    return (
        <div className="flex flex-col gap-4 px-4">
            <div>
                {title && (
                    <h2 className="text-xl font-semibold mb-3">{title}</h2>
                )}
                <div className="flex flex-wrap gap-2">
                    {MOODS.map((mood) => {
                        const isActive = activeMood?.label === mood.label;
                        return (
                            <button
                                key={mood.label}
                                onClick={() => handleMoodClick(mood)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium
                                    transition-all duration-200 border cursor-pointer
                                    ${isActive
                                        ? 'bg-white text-black border-white shadow-lg scale-105'
                                        : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/15 hover:border-white/25'
                                    }
                                `}
                            >
                                <span className="text-base">{mood.emoji}</span>
                                <span>{mood.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {activeMood && (
                <ItemsRow
                    title={`${activeMood.emoji} ${activeMood.label}`}
                    allLink={`/items?title=${encodeURIComponent(activeMood.label)}&config=${encodeURIComponent(JSON.stringify({
                        genres: activeMood.genres,
                        types: activeMood.types,
                        sortBy: ['CommunityRating'],
                        sortOrder: 'Descending',
                        limit,
                    }))}`}
                    items={{
                        genres: activeMood.genres,
                        types: activeMood.types,
                        sortBy: ['CommunityRating'],
                        sortOrder: 'Descending',
                        limit,
                    }}
                    detailFields={['ReleaseYear', 'CommunityRating']}
                />
            )}
        </div>
    );
};

export default MoodBar;
