import { useState } from 'react';

function DonationForm() {
  const initialFormData = {
    foodName: '',
    foodType: 'Rice',
    quantity: '',
    unit: 'Meals',
    description: '',
    imageUrl: '',
    pickupInstructions: '',
    location: '',
    pickupTime: '',
    expiryTime: '',
    donorName: '',
    donorEmail: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(previous => ({
      ...previous,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select a valid image file.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage('Image size must be less than 2 MB.');
      e.target.value = '';
      return;
    }

    setSelectedImageFile(file);
    setAiResult('');
    setImageLoading(true);
    setMessage('Loading image preview...');

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFormData(previous => ({
          ...previous,
          imageUrl: reader.result
        }));

        setImagePreview(reader.result);
        setMessage('Image selected successfully!');
      }

      setImageLoading(false);
    };

    reader.onerror = () => {
      setMessage('Unable to read the selected image.');
      setImageLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview('');
    setSelectedImageFile(null);
    setAiResult('');

    setFormData(previous => ({
      ...previous,
      imageUrl: ''
    }));

    const fileInput = document.getElementById('food-image');

    if (fileInput) {
      fileInput.value = '';
    }

    setMessage('Image removed.');
  };

  const handleAIPrediction = async () => {
    if (!selectedImageFile) {
      setMessage('Please upload a rice image first.');
      return;
    }

    setAiLoading(true);
    setAiResult('');

    try {
      const predictionData = new FormData();
      predictionData.append('file', selectedImageFile);

      const response = await fetch(
        'https://foodlink-ai-8qti.onrender.com/predict',
        {
          method: 'POST',
          body: predictionData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'AI prediction failed');
      }

      setAiResult(
        `AI Prediction: ${data.predicted_food} (${data.confidence}% confidence)`
      );

      setFormData(previous => ({
        ...previous,
        foodName: data.predicted_food
      }));

    } catch (error) {
      setAiResult('AI prediction error: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (imageLoading || aiLoading) {
      setMessage('Please wait until the current operation finishes.');
      return;
    }

    const pickup = new Date(formData.pickupTime);
    const expiry = new Date(formData.expiryTime);

    if (
      Number.isNaN(pickup.getTime()) ||
      Number.isNaN(expiry.getTime())
    ) {
      setMessage('Please enter valid pickup and expiry times.');
      return;
    }

    if (expiry <= pickup || expiry <= new Date()) {
      setMessage(
        'Expiry time must be later than pickup time and in the future.'
      );
      return;
    }

    setMessage('Submitting donation...');

    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          pickupTime: pickup.toISOString(),
          expiryTime: expiry.toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit donation');
      }

      setMessage('Donation submitted successfully!');
      setFormData(initialFormData);
      setImagePreview('');
      setSelectedImageFile(null);
      setAiResult('');

      const fileInput = document.getElementById('food-image');

      if (fileInput) {
        fileInput.value = '';
      }

      e.target.reset();

    } catch (error) {
      setMessage('Error: ' + error.message);
    }
  };

  return (
    <div className="donation-container">
      <h2>Donate Food</h2>

      <p>Share surplus food with people who need it.</p>

      <form onSubmit={handleSubmit}>

        <label>Food Name</label>
        <input
          name="foodName"
          value={formData.foodName}
          onChange={handleChange}
          required
        />

        <label>Food Type</label>
        <select
          name="foodType"
          value={formData.foodType}
          onChange={handleChange}
        >
          <option value="Rice">Rice</option>
          <option value="Vegetarian">Vegetarian</option>
          <option value="Non-Vegetarian">Non-Vegetarian</option>
          <option value="Other">Other</option>
        </select>

        <label>Quantity</label>
        <input
          type="number"
          name="quantity"
          min="1"
          value={formData.quantity}
          onChange={handleChange}
          required
        />

        <label>Unit</label>
        <select
          name="unit"
          value={formData.unit}
          onChange={handleChange}
        >
          <option value="Meals">Meals</option>
          <option value="Kg">Kg</option>
          <option value="Packets">Packets</option>
        </select>

        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
        />

        <label>Food Image (Optional, max 2 MB)</label>

        <input
          id="food-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
        />

        {imageLoading && (
          <p>Preparing image preview...</p>
        )}

        {imagePreview && (
          <div className="image-preview">
            <p><strong>Image Preview:</strong></p>

            <img
              src={imagePreview}
              alt="Food preview"
              style={{
                display: 'block',
                width: '200px',
                height: '180px',
                objectFit: 'cover',
                borderRadius: '10px',
                marginBottom: '10px'
              }}
            />

            <button
              type="button"
              onClick={removeImage}
            >
              Remove Image
            </button>

            <button
              type="button"
              onClick={handleAIPrediction}
              disabled={aiLoading || imageLoading}
            >
              {aiLoading
                ? 'Analyzing...'
                : '✨ Identify Rice with AI'}
            </button>

            {aiResult && (
              <p>{aiResult}</p>
            )}
          </div>
        )}

        <label>Pickup Instructions</label>
        <textarea
          name="pickupInstructions"
          value={formData.pickupInstructions}
          onChange={handleChange}
          placeholder="Example: Please collect from the main entrance."
        />

        <label>Pickup Location</label>
        <input
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
        />

        <label>Pickup Time</label>
        <input
          type="datetime-local"
          name="pickupTime"
          value={formData.pickupTime}
          onChange={handleChange}
          required
        />

        <label>Expiry Time</label>
        <input
          type="datetime-local"
          name="expiryTime"
          value={formData.expiryTime}
          onChange={handleChange}
          required
        />

        <label>Donor Name</label>
        <input
          name="donorName"
          value={formData.donorName}
          onChange={handleChange}
          required
        />

        <label>Donor Email</label>
        <input
          type="email"
          name="donorEmail"
          value={formData.donorEmail}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={imageLoading || aiLoading}
        >
          Submit Donation
        </button>

      </form>

      {message && (
        <p className="donation-message">{message}</p>
      )}
    </div>
  );
}

export default DonationForm;