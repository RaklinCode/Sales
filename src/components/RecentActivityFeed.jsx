import { useEffect, useState, useCallback } from 'react';
import supabase from '../supabase-client';

function RecentActivityFeed({ currentUser, users, onDealDeleted, selectedRep }) {
    const [deals, setDeals] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDeals = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('sales_deals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setDeals(data || []);
        } catch (error) {
            console.error('Error fetching recent deals:', error.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDeals();

        const channel = supabase
            .channel('recent-activity-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sales_deals' },
                () => {
                    setTimeout(fetchDeals, 100);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDeals]);

    const handleDelete = async (dealId) => {
        if (window.confirm('Are you sure you want to delete this deal?')) {
            try {
                const { error } = await supabase
                    .from('sales_deals')
                    .delete()
                    .eq('id', dealId);

                if (error) throw error;

                fetchDeals();
                if (onDealDeleted) onDealDeleted();
            } catch (error) {
                alert('Error deleting deal: ' + error.message);
            }
        }
    };

    if (currentUser?.account_type !== 'admin') {
        return null;
    }

    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : 'Unknown User';
    };

    const exportToCSV = () => {
        // Prepare CSV header
        const headers = ['Date', 'Sales Rep', 'Client Name', 'Amount'];

        // Prepare CSV rows
        const rows = deals.map(deal => {
            const date = new Date(deal.created_at);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return [
                formattedDate,
                getUserName(deal.user_id),
                deal.client_name || '-',
                deal.value
            ];
        });

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredDeals = selectedRep
        ? deals.filter(deal => deal.user_id === selectedRep)
        : deals;

    return (
        <div className="dashboard-section" style={{ marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0 }}>Recent Activity Feed</h2>
                <button
                    onClick={exportToCSV}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#124f33',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#187c49'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#124f33'}
                >
                    📊 Export to CSV
                </button>
            </div>
            {loading ? (
                <p>Loading...</p>
            ) : filteredDeals.length === 0 ? (
                <p>{selectedRep ? 'No recent activity for this user.' : 'No recent activity.'}</p>
            ) : (
                <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto', border: '1px solid #eee' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f5f5f5', zIndex: 1 }}>
                            <tr style={{ textAlign: 'left' }}>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Date</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Sales Rep</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Client Name</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Amount</th>
                                <th style={{ padding: '0.75rem', borderBottom: '2px solid #ddd' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDeals.map((deal) => (
                                <tr key={deal.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '0.75rem' }}>
                                        {new Date(deal.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '0.75rem' }}>{getUserName(deal.user_id)}</td>
                                    <td style={{ padding: '0.75rem' }}>{deal.client_name || '-'}</td>
                                    <td style={{ padding: '0.75rem' }}>${deal.value.toLocaleString()}</td>
                                    <td style={{ padding: '0.75rem' }}>
                                        <button
                                            onClick={() => handleDelete(deal.id)}
                                            style={{
                                                backgroundColor: '#ff6b6b',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default RecentActivityFeed;
