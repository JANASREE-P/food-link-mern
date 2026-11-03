import { useEffect, useState } from 'react';

function MyCollectionRequests({ goHome, userRole }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState('');

  const trackingSteps = [
    'Request Submitted',
    'Donor Approved',
    'Volunteer Accepted',
    'Food Collected',
    'Food Delivered'
  ];

  function getCurrentStep(request) {
    if (request.status === 'Rejected') return -1;
    if (request.status === 'Pending') return 0;
    if (request.status === 'Rejected') return -1;

    if (
      request.status === 'Completed' ||
      request.taskStatus === 'Delivered'
    ) {
      return 4;
    }

    if (request.taskStatus === 'Collected') return 3;
    if (request.taskStatus === 'Accepted') return 2;

    return 1;
  }

  async function fetchRequests() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/collection-requests', {
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load collection requests'
        );
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  async function updateStatus(requestId, status) {
    setUpdatingId(requestId);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `/api/collection-requests/${requestId}/status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to update request status'
        );
      }

      setRequests((previousRequests) =>
        previousRequests.map((request) =>
          request._id === requestId ? data.request : request
        )
      );

      setMessage(`Request ${status.toLowerCase()} successfully!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function acceptTask(requestId) {
    setUpdatingId(requestId);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `/api/collection-requests/${requestId}/accept`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept task');
      }

      setMessage('Task accepted successfully!');
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateTaskStatus(requestId, taskStatus) {
    setUpdatingId(requestId);
    setError('');
    setMessage('');

    try {
      const response = await fetch(
        `/api/collection-requests/${requestId}/task-status`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ taskStatus })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to update task progress'
        );
      }

      setMessage(
        taskStatus === 'Collected'
          ? 'Food marked as collected!'
          : 'Food marked as delivered!'
      );

      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="find-food-container">
      <button onClick={goHome}>← Back to Home</button>

      <h2>📋 My Collection Requests</h2>

      <p>
        {userRole === 'donor'
          ? 'Requests received for your food donations.'
          : userRole === 'ngo'
            ? 'Collection requests you have submitted.'
            : 'Collection tasks available to you.'}
      </p>

      {loading && <p>Loading requests...</p>}

      {error && <p role="alert">{error}</p>}

      {message && <p role="status">{message}</p>}

      {!loading && !error && requests.length === 0 && (
        <p>No collection requests found.</p>
      )}

      {!loading && requests.length > 0 && (
        <div className="food-grid">
          {requests.map((request) => {
            const donation =
              request.donationId &&
              typeof request.donationId === 'object'
                ? request.donationId
                : {};

            const currentStatus = request.status || 'Pending';
            const taskStatus = request.taskStatus || 'Available';

            const volunteer =
              request.volunteerId &&
              typeof request.volunteerId === 'object'
                ? request.volunteerId
                : null;

            const isUpdating = updatingId === request._id;
            const currentStep = getCurrentStep(request);

            return (
              <div className="food-card" key={request._id}>
                <h3>
                  🍱 {donation.foodName || 'Food donation'}
                </h3>

                <p>
                  <strong>Quantity:</strong>{' '}
                  {donation.quantity ?? 'N/A'}{' '}
                  {donation.unit || ''}
                </p>

                <p>
                  <strong>Location:</strong>{' '}
                  {donation.location || 'N/A'}
                </p>

                <p>
                  <strong>Requested by:</strong>{' '}
                  {request.requesterName ||
                    request.requesterId?.fullName ||
                    'N/A'}
                </p>

                {userRole === 'donor' && (
                  <p>
                    <strong>Requester Email:</strong>{' '}
                    {request.requesterEmail ||
                      request.requesterId?.email ||
                      'N/A'}
                  </p>
                )}

                <p>
                  <strong>Request Date:</strong>{' '}
                  {request.createdAt
                    ? new Date(request.createdAt).toLocaleString()
                    : 'N/A'}
                </p>

                <p className="request-status">
                  <strong>Request Status:</strong>{' '}
                  <span
                    className={`status-badge ${currentStatus.toLowerCase()}`}
                  >
                    {currentStatus}
                  </span>
                </p>

                {/* COLLECTION TRACKING TIMELINE */}

                <div className="collection-timeline">
                  <h4>📍 Collection Progress</h4>

                  {currentStatus === 'Rejected' ? (
                    <p className="timeline-rejected">
                      ❌ This collection request was rejected.
                    </p>
                  ) : (
                    <div className="timeline-steps">
                      {trackingSteps.map((step, index) => (
                        <div
                          className={`timeline-step ${
                            index < currentStep
                              ? 'completed'
                              : index === currentStep
                                ? 'active'
                                : ''
                          }`}
                          key={step}
                        >
                          <div className="timeline-circle">
                            {index <= currentStep
                              ? '✓'
                              : index + 1}
                          </div>

                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {userRole === 'ngo' && (
                  <>
                    <p>
                      <strong>Task Status:</strong> {taskStatus}
                    </p>

                    {volunteer && (
                      <p>
                        <strong>Volunteer:</strong>{' '}
                        {volunteer.fullName || volunteer.email}
                      </p>
                    )}
                  </>
                )}

                {/* DONOR ACTIONS */}

                {userRole === 'donor' &&
                  currentStatus === 'Pending' && (
                    <div className="status-update">
                      <strong>Respond to request:</strong>

                      <button
                        disabled={isUpdating}
                        onClick={() =>
                          updateStatus(request._id, 'Approved')
                        }
                      >
                        Approve
                      </button>

                      <button
                        disabled={isUpdating}
                        onClick={() =>
                          updateStatus(request._id, 'Rejected')
                        }
                      >
                        Reject
                      </button>
                    </div>
                  )}

                {/* VOLUNTEER ACTIONS */}

                {userRole === 'volunteer' && (
                  <div className="status-update">
                    <p>
                      <strong>Task Status:</strong> {taskStatus}
                    </p>

                    {currentStatus === 'Approved' &&
                      !volunteer &&
                      taskStatus === 'Available' && (
                        <button
                          disabled={isUpdating}
                          onClick={() => acceptTask(request._id)}
                        >
                          {isUpdating ? 'Accepting...' : 'Accept Task'}
                        </button>
                      )}

                    {volunteer &&
                      currentStatus === 'Approved' &&
                      taskStatus === 'Accepted' && (
                        <>
                          <p>
                            <strong>Assigned Volunteer:</strong>{' '}
                            {volunteer.fullName || volunteer.email}
                          </p>

                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateTaskStatus(
                                request._id,
                                'Collected'
                              )
                            }
                          >
                            {isUpdating
                              ? 'Updating...'
                              : 'Mark as Collected'}
                          </button>
                        </>
                      )}

                    {volunteer &&
                      currentStatus === 'Approved' &&
                      taskStatus === 'Collected' && (
                        <>
                          <p>
                            <strong>Assigned Volunteer:</strong>{' '}
                            {volunteer.fullName || volunteer.email}
                          </p>

                          <button
                            disabled={isUpdating}
                            onClick={() =>
                              updateTaskStatus(
                                request._id,
                                'Delivered'
                              )
                            }
                          >
                            {isUpdating
                              ? 'Updating...'
                              : 'Mark as Delivered'}
                          </button>
                        </>
                      )}

                    {taskStatus === 'Delivered' && (
                      <p role="status">
                        ✅ Food delivered successfully!
                      </p>
                    )}

                    {currentStatus === 'Rejected' && (
                      <p>This collection request was rejected.</p>
                    )}
                  </div>
                )}

                {isUpdating && <p>Updating task...</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyCollectionRequests;