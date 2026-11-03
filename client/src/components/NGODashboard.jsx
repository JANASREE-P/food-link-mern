import { useEffect, useState } from 'react';

function NGODashboard({ user, onFindFood, onMyRequests }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard/ngo', {
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load dashboard');
        }

        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const cards = [
    {
      title: 'Available Food',
      value: stats?.availableFood,
      icon: '🍱'
    },
    {
      title: 'Total Requests',
      value: stats?.totalRequests,
      icon: '📋'
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests,
      icon: '⏳'
    },
    {
      title: 'Approved Requests',
      value: stats?.approvedRequests,
      icon: '✅'
    },
    {
      title: 'Completed Collections',
      value: stats?.completedCollections,
      icon: '💚'
    }
  ];

  if (loading) {
    return <h2>Loading NGO Dashboard...</h2>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="donor-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.fullName}! 🤝</h1>
        <p>Track available food and manage your collection requests.</p>
      </div>

      <div className="dashboard-actions">
        <button onClick={onFindFood}>Find Food</button>
        <button onClick={onMyRequests}>My Collection Requests</button>
      </div>

      <h2>Collection Overview</h2>

      <div className="dashboard-cards">
        {cards.map(card => (
          <div className="dashboard-card" key={card.title}>
            <span className="dashboard-icon">{card.icon}</span>
            <h3>{card.value}</h3>
            <p>{card.title}</p>
          </div>
        ))}
      </div>

      <div className="recent-donations">
        <h2>Recent Collection Requests</h2>

        {stats?.recentRequests?.length > 0 ? (
          stats.recentRequests.map(request => (
            <div className="recent-donation-card" key={request._id}>
              <h3>
                🍱 {request.donationId?.foodName || 'Food donation'}
              </h3>

              <p>
                Quantity: {request.donationId?.quantity || '-'}{' '}
                {request.donationId?.unit || ''}
              </p>

              <p>Request Status: {request.status}</p>

              <p>
                Requested on:{' '}
                {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p>You haven't submitted any collection requests yet.</p>
        )}
      </div>
    </div>
  );
}

export default NGODashboard;