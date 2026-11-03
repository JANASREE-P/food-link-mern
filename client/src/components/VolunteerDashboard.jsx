import { useEffect, useState } from 'react';

function VolunteerDashboard({ user, onFindTasks, onMyRequests }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await fetch('/api/dashboard/volunteer', {
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
      title: 'Available Delivery Tasks',
      value: stats?.availableTasks,
      icon: '📦'
    },
    {
      title: 'Accepted Tasks',
      value: stats?.acceptedTasks,
      icon: '🤝'
    },
    {
      title: 'Food Awaiting Delivery',
      value: stats?.awaitingDelivery,
      icon: '🚚'
    },
    {
      title: 'Completed Deliveries',
      value: stats?.completedDeliveries,
      icon: '💚'
    }
  ];

  if (loading) {
    return <h2>Loading Volunteer Dashboard...</h2>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>{error}</p>;
  }

  return (
    <div className="donor-dashboard">
      <div className="dashboard-header">
        <h1>Welcome, {user?.fullName}! 🚚</h1>
        <p>
          Manage your delivery tasks and help food reach the people
          who need it.
        </p>
      </div>

      <div className="dashboard-actions">
        <button onClick={onFindTasks}>Find Delivery Tasks</button>
        <button onClick={onMyRequests}>My Collection Requests</button>
      </div>

      <h2>Delivery Overview</h2>

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
        <h2>Recent Delivery Activities</h2>

        {stats?.recentTasks?.length > 0 ? (
          stats.recentTasks.map(task => (
            <div className="recent-donation-card" key={task._id}>
              <h3>
                🍱 {task.donationId?.foodName || 'Food donation'}
              </h3>

              <p>
                Quantity: {task.donationId?.quantity || '-'}{' '}
                {task.donationId?.unit || ''}
              </p>

              <p>
                NGO: {task.requesterId?.fullName ||
                  task.requesterName || 'NGO'}
              </p>

              <p>
                Location: {task.donationId?.location || 'Not available'}
              </p>

              <p>
                Task Status: {task.taskStatus || 'Available'}
              </p>

              <p>
                Updated: {new Date(task.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ))
        ) : (
          <p>You haven't accepted any delivery tasks yet.</p>
        )}
      </div>
    </div>
  );
}

export default VolunteerDashboard;