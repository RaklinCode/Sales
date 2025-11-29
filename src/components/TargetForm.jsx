import { useState } from 'react';
import supabase from '../supabase-client';
import { useAuth } from '../context/AuthContext';

function TargetForm({ onTargetUpdated }) {
    const { session, users } = useAuth();
    const [targetValue, setTargetValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const currentUser = users.find((u) => u.id === session?.user?.id);
    const isAdmin = currentUser?.account_type === 'admin';

    if (!isAdmin) {
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('sales_targets')
                .insert({ target_value: targetValue });

            if (error) throw error;

            setTargetValue('');
            if (onTargetUpdated) {
                onTargetUpdated();
            }
        } catch (err) {
            console.error('Error setting target:', err);
            setError('Failed to set target');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="add-form-container" style={{ marginTop: '1rem' }}>
            <form onSubmit={handleSubmit} aria-label="Set sales target">
                <label htmlFor="target-value">
                    Set Quarterly Target: $
                    <input
                        id="target-value"
                        type="number"
                        value={targetValue}
                        onChange={(e) => setTargetValue(e.target.value)}
                        className="amount-input"
                        min="0"
                        step="100"
                        required
                        disabled={isSubmitting}
                    />
                </label>
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Setting...' : 'Set Target'}
                </button>
            </form>
            {error && <div className="error-message">{error}</div>}
        </div>
    );
}

export default TargetForm;
