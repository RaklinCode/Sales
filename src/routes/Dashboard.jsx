import supabase from '../supabase-client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Chart } from 'react-charts';
import Form from '../components/Form';
import TargetForm from '../components/TargetForm';

function Dashboard() {
  const [metrics, setMetrics] = useState([]);
  const [target, setTarget] = useState(null);
  const { session } = useAuth();
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    if (session?.user?.id) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => setCurrentUser(data));
    }
  }, [session]);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from('user_profiles').select('*');
    setAllUsers(data || []);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to remove this employee? This will also delete all their sales data.')) {
      const { error } = await supabase.rpc('delete_employee', { target_user_id: userId });
      if (error) {
        alert('Error removing user: ' + error.message);
      } else {
        fetchUsers();
        fetchMetrics(); // Refresh metrics as deals are cascadingly deleted
      }
    }
  };

  const fetchMetrics = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales_by_user')
        .select('*');
      if (error) {
        throw error;
      }
      console.log("Fetched metrics:", data);
      setMetrics(data || []);
    } catch (error) {
      console.error('Error fetching metrics:', error.message);
    }
  }, []);

  const fetchTarget = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sales_targets')
        .select('target_value')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setTarget(Number(data[0].target_value));
      }
    } catch (error) {
      // Ignore error if table doesn't exist yet
      console.log('Could not fetch target (table might not exist yet)');
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchTarget();

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_deals' },
        () => {
          setTimeout(fetchMetrics, 100);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_targets' },
        () => {
          setTimeout(fetchTarget, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics, fetchTarget]);

  const chartData = useMemo(() => [
    {
      label: 'Sales',
      data: metrics.map((m) => ({
        primary: m.name,
        secondary: m.total_sales,
      })),
    },
  ], [metrics]);

  const primaryAxis = useMemo(() => ({
    getValue: (d) => d.primary || 'Unknown',
    scaleType: 'band',
    padding: 0.2,
    position: 'bottom',
    show: true,
  }), []);

  const maxY = useMemo(() => {
    let max = 5000;
    if (metrics.length > 0) {
      const maxSales = Math.max(...metrics.map((m) => m.total_sales));
      max = Math.max(max, maxSales + 2000);
    }
    if (target) {
      max = Math.max(max, target + 1000);
    }
    return max;
  }, [metrics, target]);

  const secondaryAxes = useMemo(() => [
    {
      getValue: (d) => d.secondary,
      scaleType: 'linear',
      min: 0,
      max: maxY,
      padding: {
        top: 20,
        bottom: 40,
      },
    },
  ], [maxY]);

  return (
    <div
      className="dashboard-wrapper"
      role="region"
      aria-label="Sales dashboard"
    >
      <div
        className="chart-container"
        role="region"
        aria-label="Sales chart and data"
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '1rem' }}>
          <h2>Total Sales This Quarter ($)</h2>
          {target !== null && (
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#134e32' }}>
              Target: ${target.toLocaleString()}
            </div>
          )}
        </div>
        <div style={{ width: '100%', flexGrow: 1, position: 'relative' }}>
          <Chart
            options={{
              data: chartData,
              primaryAxis,
              secondaryAxes,
              type: 'bar',
              defaultColors: ['#58d675'],
              tooltip: {
                show: false,
              },
            }}
          />
          {target !== null && (
            <div
              style={{
                position: 'absolute',
                bottom: '40px', // Approximate bottom padding of chart
                left: '50px',   // Approximate left padding
                right: '10px',
                height: `calc((100% - 60px) * (${target} / ${maxY}))`,
                borderTop: '2px dashed #ff6b6b',
                pointerEvents: 'none',
                zIndex: 10
              }}
            />
          )}
        </div>
      </div>
      <Form onDealAdded={fetchMetrics} />
      <TargetForm onTargetUpdated={fetchTarget} />

      {currentUser?.account_type === 'admin' && (
        <div className="dashboard-section" style={{ marginTop: '2rem' }}>
          <h2>Manage Team</h2>
          <div className="employee-list">
            {allUsers
              .filter(u => u.account_type === 'rep')
              .map(user => (
                <div key={user.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  borderBottom: '1px solid #eee'
                }}>
                  <span>{user.name}</span>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    style={{
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            {allUsers.filter(u => u.account_type === 'rep').length === 0 && (
              <p>No sales reps found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;