import { useEffect, useState } from 'react';

function MyDonations({ goHome, user }) {
const [donations, setDonations] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');
const [message, setMessage] = useState('');
const [editingId, setEditingId] = useState(null);
const [editData, setEditData] = useState({});
const [editImagePreview, setEditImagePreview] = useState('');

const fetchDonations = async () => {
try {
setLoading(true);

  const response = await fetch('/api/donations', {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to load donations');
  }

  if (!Array.isArray(data)) {
    throw new Error('Unexpected donation data received');
  }

  const myDonations = data.filter(donation => {
    const donorId = donation.donorId?._id || donation.donorId;
    return String(donorId) === String(user?.id);
  });

  setDonations(myDonations);
  setError('');
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}


};

useEffect(() => {
fetchDonations();
}, [user?.id]);

const startEditing = donation => {
setEditingId(donation._id);

setEditData({
  foodName: donation.foodName || '',
  foodType: donation.foodType || '',
  quantity: donation.quantity || '',
  unit: donation.unit || '',
  description: donation.description || '',
  location: donation.location || '',
  pickupTime: donation.pickupTime
    ? new Date(donation.pickupTime).toISOString().slice(0, 16)
    : '',
  expiryTime: donation.expiryTime
    ? new Date(donation.expiryTime).toISOString().slice(0, 16)
    : '',
  imageUrl: donation.imageUrl || '',
  pickupInstructions: donation.pickupInstructions || ''
});

setEditImagePreview(donation.imageUrl || '');
setError('');
setMessage('');

};

const handleEditImageChange = event => {
const file = event.target.files[0];

if (!file) return;

if (!file.type.startsWith('image/')) {
  setError('Please select a valid image file.');
  event.target.value = '';
  return;
}

if (file.size > 2 * 1024 * 1024) {
  setError('Image size must be less than 2 MB.');
  event.target.value = '';
  return;
}

const reader = new FileReader();

reader.onload = () => {
  if (typeof reader.result === 'string') {
    setEditData(previous => ({
      ...previous,
      imageUrl: reader.result
    }));

    setEditImagePreview(reader.result);
    setError('');
  }
};

reader.onerror = () => {
  setError('Unable to read the selected image.');
};

reader.readAsDataURL(file);

};

const handleUpdate = async id => {
try {
const pickup = new Date(editData.pickupTime);
const expiry = new Date(editData.expiryTime);

  if (
    Number.isNaN(pickup.getTime()) ||
    Number.isNaN(expiry.getTime()) ||
    expiry <= new Date() ||
    pickup >= expiry
  ) {
    setError('Please check the pickup and expiry times.');
    return;
  }

  const response = await fetch(`/api/donations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      ...editData,
      quantity: Number(editData.quantity),
      pickupTime: pickup.toISOString(),
      expiryTime: expiry.toISOString()
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to update donation');
  }

  setMessage('Donation updated successfully!');
  setEditingId(null);
  setEditImagePreview('');

  await fetchDonations();
} catch (err) {
  setError(err.message);
}

};

const handleDelete = async id => {
if (!window.confirm('Are you sure you want to delete this donation?')) {
return;
}

try {
  const response = await fetch(`/api/donations/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete donation');
  }

  setMessage('Donation deleted successfully!');
  await fetchDonations();
} catch (err) {
  setError(err.message);
}

};

if (loading) {
return <h2>Loading your donations...</h2>;
}

return (
<div className="my-donations" style={{ padding: '30px' }}> <button onClick={goHome}>← Back to Home</button>

```
  <h1>My Donations 🌱</h1>
  <p>Manage your food donations.</p>

  {message && <p style={{ color: 'green' }}>{message}</p>}
  {error && <p style={{ color: 'red' }}>{error}</p>}

  {donations.length === 0 ? (
    <p>You have not created any donations yet.</p>
  ) : (
    donations.map(donation => (
      <div
        key={donation._id}
        style={{
          border: '1px solid #ccc',
          borderRadius: '10px',
          padding: '20px',
          margin: '15px 0'
        }}
      >
        {editingId === donation._id ? (
          <>
            <h2>Edit Donation</h2>

            {editImagePreview && (
              <div className="image-preview">
                <p><strong>Image Preview:</strong></p>

                <img
                  src={editImagePreview}
                  alt="Food preview"
                  style={{
                    width: '200px',
                    height: '180px',
                    objectFit: 'cover',
                    borderRadius: '10px'
                  }}
                />
              </div>
            )}

            <label>Change Food Image</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleEditImageChange}
            />

            {editImagePreview && (
              <button
                type="button"
                onClick={() => {
                  setEditImagePreview('');
                  setEditData(previous => ({
                    ...previous,
                    imageUrl: ''
                  }));
                }}
              >
                Remove Image
              </button>
            )}

            {Object.keys(editData).filter(
              field => field !== 'imageUrl'
            ).map(field => (
              <div key={field} style={{ marginBottom: '12px' }}>
                <label>{field}</label>

                {field === 'description' ||
                field === 'pickupInstructions' ? (
                  <textarea
                    value={editData[field]}
                    onChange={e =>
                      setEditData({
                        ...editData,
                        [field]: e.target.value
                      })
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px',
                      marginTop: '5px'
                    }}
                  />
                ) : (
                  <input
                    type={
                      field === 'quantity'
                        ? 'number'
                        : field === 'pickupTime' ||
                          field === 'expiryTime'
                          ? 'datetime-local'
                          : 'text'
                    }
                    value={editData[field]}
                    onChange={e =>
                      setEditData({
                        ...editData,
                        [field]: e.target.value
                      })
                    }
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px',
                      marginTop: '5px'
                    }}
                  />
                )}
              </div>
            ))}

            <button onClick={() => handleUpdate(donation._id)}>
              Save Changes
            </button>

            <button
              onClick={() => {
                setEditingId(null);
                setEditImagePreview('');
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {donation.imageUrl && (
              <img
                src={donation.imageUrl}
                alt={donation.foodName}
                className="food-card-image"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: '10px'
                }}
              />
            )}

            <h2>🍱 {donation.foodName}</h2>

            <p><strong>Type:</strong> {donation.foodType}</p>

            <p>
              <strong>Quantity:</strong>{' '}
              {donation.quantity} {donation.unit}
            </p>

            <p>
              <strong>Description:</strong>{' '}
              {donation.description || 'Not provided'}
            </p>

            <p><strong>Location:</strong> {donation.location}</p>

            <p>
              <strong>Pickup Instructions:</strong>{' '}
              {donation.pickupInstructions || 'Not provided'}
            </p>

            <p><strong>Status:</strong> {donation.status}</p>

            <button
              disabled={donation.status !== 'Available'}
              onClick={() => startEditing(donation)}
            >
              Edit
            </button>

            <button
              disabled={donation.status !== 'Available'}
              onClick={() => handleDelete(donation._id)}
            >
              Delete
            </button>
          </>
        )}
      </div>
    ))
  )}
</div>

);
}

export default MyDonations;
