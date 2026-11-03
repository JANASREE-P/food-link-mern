
import { useEffect, useState } from 'react';

function FindFood({ goHome }) {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestingId, setRequestingId] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFoodType, setSelectedFoodType] = useState('All');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    async function fetchDonations() {
      try {
        const response = await fetch('/api/donations', {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to load donations');
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error('Invalid donation data received');
        }

        setDonations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDonations();
  }, []);

  async function requestCollection(donationId) {
    const requesterName = window.prompt('Enter your name:');

    if (!requesterName || !requesterName.trim()) {
      return;
    }

    const requesterEmail = window.prompt('Enter your email address:');

    if (!requesterEmail || !requesterEmail.trim()) {
      return;
    }

    setRequestingId(donationId);
    setRequestMessage('');

    try {
      const response = await fetch('/api/collection-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          donationId,
          requesterName: requesterName.trim(),
          requesterEmail: requesterEmail.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }

      setRequestMessage('Collection request submitted successfully!');
    } catch (error) {
      setRequestMessage(error.message);
    } finally {
      setRequestingId(null);
    }
  }

  function getUrgency(expiryTime) {
    const expiryDate = new Date(expiryTime);
    const currentTime = new Date();

    const remainingHours =
      (expiryDate.getTime() - currentTime.getTime()) /
      (1000 * 60 * 60);

    if (remainingHours <= 2) {
      return {
        label: '🔴 Critical - Collect Immediately',
        className: 'urgency-critical'
      };
    }

    if (remainingHours <= 6) {
      return {
        label: '🟠 High - Urgent Collection',
        className: 'urgency-high'
      };
    }

    if (remainingHours <= 24) {
      return {
        label: '🟡 Moderate - Collect Soon',
        className: 'urgency-moderate'
      };
    }

    return {
      label: '🟢 Low - Time Available',
      className: 'urgency-low'
    };
  }

  const availableDonations = donations.filter(donation => {
    const expiryDate = new Date(donation.expiryTime);

    return (
      donation.status === 'Available' &&
      !Number.isNaN(expiryDate.getTime()) &&
      expiryDate > new Date()
    );
  });

  const foodTypes = [
    ...new Set(
      availableDonations
        .map(donation => donation.foodType)
        .filter(Boolean)
    )
  ];

  const filteredDonations = availableDonations.filter(donation => {
    const matchesSearch = (donation.foodName || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesFoodType =
      selectedFoodType === 'All' ||
      donation.foodType === selectedFoodType;

    const matchesLocation = (donation.location || '')
      .toLowerCase()
      .includes(locationFilter.toLowerCase());

    return matchesSearch && matchesFoodType && matchesLocation;
  });

  const recommendedDonations = [...filteredDonations].sort((a, b) => {
    return new Date(a.expiryTime) - new Date(b.expiryTime);
  });

  const recommendedIds = new Set(
    recommendedDonations
      .slice(0, 3)
      .map(donation => donation._id)
  );

  function formatDate(dateValue) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return 'Not available';
    }

    return date.toLocaleString();
  }

  return (
    <div className="find-food-container">
      <button type="button" onClick={goHome}>
        ← Back to Home
      </button>

      <h2>🍱 Find Available Food</h2>
      <p>Discover surplus food available for collection.</p>

      <div className="food-filters">
        <input
          type="text"
          placeholder="Search food by name..."
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
        />

        <select
          value={selectedFoodType}
          onChange={event => setSelectedFoodType(event.target.value)}
        >
          <option value="All">All Food Types</option>

          {foodTypes.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Filter by location..."
          value={locationFilter}
          onChange={event => setLocationFilter(event.target.value)}
        />

        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            setSelectedFoodType('All');
            setLocationFilter('');
          }}
        >
          Clear Filters
        </button>
      </div>

      {loading && <p>Loading donations...</p>}

      {error && <p className="error-message">{error}</p>}

      {requestMessage && (
        <p className="request-message">{requestMessage}</p>
      )}

      {!loading && !error && availableDonations.length === 0 && (
        <p>No available food donations at the moment.</p>
      )}

      {!loading &&
        !error &&
        availableDonations.length > 0 &&
        filteredDonations.length === 0 && (
          <p>No food donations match your search or filters.</p>
        )}

      {!loading && !error && filteredDonations.length > 0 && (
        <>
          <h2>✨ Recommended Food for You</h2>

          <p>
            Smart recommendations based on food availability and
            expiry urgency.
          </p>

          <div className="food-grid">
            {recommendedDonations.map(donation => {
              const urgency = getUrgency(donation.expiryTime);

              return (
                <div className="food-card" key={donation._id}>
                  {donation.imageUrl && (
                    <img
                      src={donation.imageUrl}
                      alt={donation.foodName}
                      className="food-card-image"
                    />
                  )}

                  <h3>🌱 {donation.foodName}</h3>

                  {recommendedIds.has(donation._id) && (
                    <span className="recommended-badge">
                      ✨ Recommended for You
                    </span>
                  )}

                  <p>
                    <strong>Food Type:</strong> {donation.foodType}
                  </p>

                  <p>
                    <strong>Quantity:</strong> {donation.quantity}{' '}
                    {donation.unit}
                  </p>

                  <p>
                    <strong>Location:</strong> {donation.location}
                  </p>

                  <p>
                    <strong>Pickup Time:</strong>{' '}
                    {formatDate(donation.pickupTime)}
                  </p>

                  <p>
                    <strong>Expiry Time:</strong>{' '}
                    {formatDate(donation.expiryTime)}
                  </p>

                  <div className={`urgency-badge ${urgency.className}`}>
                    <strong>Smart Urgency:</strong>
                    <p>{urgency.label}</p>
                  </div>

                  {donation.description && (
                    <p>
                      <strong>Description:</strong>{' '}
                      {donation.description}
                    </p>
                  )}

                  {donation.pickupInstructions && (
                    <p>
                      <strong>Pickup Instructions:</strong>{' '}
                      {donation.pickupInstructions}
                    </p>
                  )}

                  <span className="food-status">
                    {donation.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => requestCollection(donation._id)}
                    disabled={requestingId === donation._id}
                  >
                    {requestingId === donation._id
                      ? 'Submitting Request...'
                      : 'Request Collection'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default FindFood;
