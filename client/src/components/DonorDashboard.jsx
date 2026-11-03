import { useEffect, useState } from 'react';

function DonorDashboard({ user, onDonate, onMyDonations }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard/donor', {
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
      title: 'Total Donations',
      value: stats?.totalDonations,
      icon: '🍱'
    },
    {
      title: 'Available Donations',
      value: stats?.availableDonations,
      icon: '🥗'
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
      value: stats?.completedDonations,
      icon: '💚'
    }
  ];

  if (loading) {
    return <h2>Loading Donor Dashboard...</h2>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="donor-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.fullName}! 🌱</h1>
        <p>Here's an overview of your food donations and collection activity.</p>
      </div>

      <div className="dashboard-actions">
        <button onClick={onDonate}>+ Donate Food</button>
        <button onClick={onMyDonations}>My Donations</button>
      </div>

      <h2>Donation Overview</h2>

      <div className="dashboard-cards">
        {cards.map((card) => (
          <div className="dashboard-card" key={card.title}>
            <span className="dashboard-icon">{card.icon}</span>
            <h3>{card.value}</h3>
            <p>{card.title}</p>
          </div>
        ))}
      </div>

      <div className="recent-donations">
        <h2>Recent Donations</h2>

        {stats?.recentDonations?.length > 0 ? (
          stats.recentDonations.map((donation) => (
            <div className="recent-donation-card" key={donation._id}>
              <h3>🍱 {donation.foodName}</h3>
              <p>
                Quantity: {donation.quantity} {donation.unit}
              </p>
              <p>Location: {donation.location}</p>
              <p>Status: {donation.status}</p>
            </div>
          ))
        ) : (
          <p>No donations created yet.</p>
        )}
      </div>
    </div>
  );
}

export default DonorDashboard;