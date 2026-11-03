import React, { useState } from 'react';

function Login({ onLoginSuccess, onRegisterClick }) {
const [formData, setFormData] = useState({
email: '',
password: ''
});

const [message, setMessage] = useState('');
const [isError, setIsError] = useState(false);
const [loading, setLoading] = useState(false);

const handleChange = (event) => {
  const { name, value } = event.target;

  setFormData((previousData) => ({
    ...previousData,
    [name]: value
  }));
};
const handleSubmit = async (event) => {
event.preventDefault();
setMessage('');
setIsError(false);
setLoading(true);

try {
  const response = await fetch('/api/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }

  if (!data.user) {
    throw new Error(
      'Login succeeded, but user information was not returned.'
    );
  }

  setMessage(`Welcome back, ${data.user.fullName}!`);

  if (onLoginSuccess) {
    onLoginSuccess(data.user);
  }
} catch (error) {
  setIsError(true);
  setMessage(error.message || 'Unable to connect to the server');
} finally {
  setLoading(false);
}

};

return ( <div className="auth-container"> <div className="auth-card"> <h1>Welcome Back!</h1> <p>Login to your Food Link account.</p>

    <form onSubmit={handleSubmit}>
      <label htmlFor="email">Email Address</label>
      <input
        id="email"
        type="email"
        name="email"
        placeholder="Enter your email"
        value={formData.email}
        onChange={handleChange}
        required
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        name="password"
        placeholder="Enter your password"
        value={formData.password}
        onChange={handleChange}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>

    {message && (
      <p style={{ color: isError ? 'red' : 'green' }}>
        {message}
      </p>
    )}

    <p className="auth-switch">
      Don't have an account?{' '}
      <button
        type="button"
        onClick={onRegisterClick}
        className="register-link"
      >
        Register
      </button>
    </p>
  </div>
</div>
);
}

export default Login;
