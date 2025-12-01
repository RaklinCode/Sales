import { useMemo } from 'react';

function Leaderboard({ metrics }) {
    const rankedMetrics = useMemo(() => {
        return [...metrics]
            .filter(m => m.account_type !== 'admin')
            .sort((a, b) => b.total_sales - a.total_sales)
            .slice(0, 10); // Show top 10
    }, [metrics]);

    if (rankedMetrics.length === 0) {
        return null;
    }

    const getMedalEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getRankStyle = (rank) => {
        if (rank === 1) {
            return {
                background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                border: '2px solid #d4af37',
                fontWeight: 'bold',
                transform: 'scale(1.02)',
            };
        }
        if (rank === 2) {
            return {
                background: 'linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%)',
                border: '2px solid #a8a8a8',
            };
        }
        if (rank === 3) {
            return {
                background: 'linear-gradient(135deg, #cd7f32 0%, #e5a76a 100%)',
                border: '2px solid #b87333',
            };
        }
        return {
            background: '#fff',
            border: '1px solid #eee',
        };
    };

    return (
        <div style={{
            padding: '0 1rem 1rem 1rem',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            border: '1px solid #eee',
        }}>
            <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.5rem',
                color: '#333'
            }}>
                🏆 Leaderboard
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rankedMetrics.map((metric, index) => {
                    const rank = index + 1;
                    return (
                        <div
                            key={metric.user_id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                transition: 'transform 0.2s',
                                ...getRankStyle(rank),
                            }}
                        >
                            <div style={{
                                fontSize: rank <= 3 ? '1.5rem' : '1rem',
                                fontWeight: 'bold',
                                minWidth: '2.5rem',
                                textAlign: 'center',
                            }}>
                                {getMedalEmoji(rank)}
                            </div>
                            <div style={{ flex: 1, marginLeft: '0.75rem' }}>
                                <div style={{
                                    fontWeight: rank === 1 ? 'bold' : '500',
                                    fontSize: rank === 1 ? '1.1rem' : '1rem',
                                }}>
                                    {metric.name}
                                </div>
                                <div style={{
                                    fontSize: '0.9rem',
                                    color: '#666',
                                    marginTop: '0.25rem',
                                }}>
                                    ${metric.total_sales.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default Leaderboard;
