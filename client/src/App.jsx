
import { useState, useEffect } from 'react';
import './App.css';

import Login from './components/Login';
import Register from './components/Register';
import DonationForm from './components/DonationForm';
import FindFood from './components/FindFood';
import MyCollectionRequests from './components/MyCollectionRequests';
import MyDonations from './components/MyDonations';
import DonorDashboard from './components/DonorDashboard';
import NGODashboard from './components/NGODashboard';
import VolunteerDashboard from './components/VolunteerDashboard';

function App() {
  const [page, setPage] = useState('home');
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

useEffect(() => {
  const checkSession = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session check failed:', error);
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  };

  checkSession();
}, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setPage('home');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error('Logout failed:', data.error || response.statusText);
        return;
      }

      setUser(null);
      setPage('home');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
if (checkingSession) {
  return <p>Checking login session...</p>;
}
  return (
    <div className="App">
      <nav className="navbar">
        <h2 onClick={() => setPage('home')}>🌱 Food Link</h2>

        <div className="nav-links">
          <button onClick={() => setPage('home')}>Home</button>

          {!user ? (
            <>
              <button onClick={() => setPage('login')}>Login</button>
              <button onClick={() => setPage('register')}>Register</button>
            </>
          ) : (
            <>
              {user.role === 'donor' && (
                <>
                <button onClick={() => setPage('dashboard')}>
  Dashboard
</button>
                  <button onClick={() => setPage('donation')}>
                    Donate Food
                  </button>

                  <button onClick={() => setPage('mydonations')}>
                    My Donations
                  </button>
                </>
              )}
              {user.role === 'ngo' && (
  <button onClick={() => setPage('ngodashboard')}>
    Dashboard
  </button>
)}
{user.role === 'volunteer' && (
  <button onClick={() => setPage('volunteerdashboard')}>
    Dashboard
  </button>
)}

              <button onClick={() => setPage('findfood')}>
                Find Food
              </button>

              <button onClick={() => setPage('requests')}>
                My Collection Requests
              </button>

              <button onClick={handleLogout}>Logout</button>
            </>
          )}
        </div>
      </nav>

      {page === 'home' && (
        <>
          <section className="hero">
            <h1>Good Food. Better Future.</h1>
            <p>
              Connecting surplus food with people who need it.
              Together, let's reduce food waste!
            </p>

            <div className="hero-buttons">
              {!user && (
                <button onClick={() => setPage('register')}>
                  Get Started
                </button>
              )}

              {user?.role === 'donor' && (
                <button onClick={() => setPage('donation')}>
                  Donate Food
                </button>
              )}

              {user && (
                <button onClick={() => setPage('findfood')}>
                  Find Food
                </button>
              )}
            </div>
          </section>

          <section className="about">
            <h2>About Food Link</h2>
            <p>
              Food Link connects food donors with NGOs and volunteers
              to redistribute surplus food and build a zero-waste future.
            </p>
          </section>

          <section className="how-it-works">
            <h2>How It Works</h2>

            <div className="steps">
              <div className="step-card">
                <h3>🍱 Donate Food</h3>
                <p>Donors list their available surplus food.</p>
              </div>

              <div className="step-card">
                <h3>🤝 Connect</h3>
                <p>
                  NGOs request food and volunteers help coordinate collections.
                </p>
              </div>

              <div className="step-card">
                <h3>💚 Make an Impact</h3>
                <p>
                  Good food reaches people instead of going to waste.
                </p>
              </div>
            </div>
          </section>

          <section className="join-section">
            <h2>Be Part of the Change!</h2>
            <p>Every meal saved makes a difference.</p>

            {!user && (
              <button onClick={() => setPage('register')}>
                Get Started
              </button>
            )}
          </section>

          <footer>
            <p>© 2026 Food Link | Together for a Zero-Waste Future 🌱</p>
          </footer>
        </>
      )}

      {page === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onRegisterClick={() => setPage('register')}
        />
      )}

      {page === 'register' && (
        <Register onLoginClick={() => setPage('login')} />
      )}

      {page === 'donation' && user?.role === 'donor' && (
        <DonationForm />
      )}
      {page === 'dashboard' && user?.role === 'donor' && (
  <DonorDashboard
    user={user}
    onDonate={() => setPage('donation')}
    onMyDonations={() => setPage('mydonations')}
  />
)}
{page === 'ngodashboard' && user?.role === 'ngo' && (
  <NGODashboard
    user={user}
    onFindFood={() => setPage('findfood')}
    onMyRequests={() => setPage('requests')}
  />
)}
{page === 'volunteerdashboard' && user?.role === 'volunteer' && (
  <VolunteerDashboard
    user={user}
    onFindTasks={() => setPage('requests')}
    onMyRequests={() => setPage('requests')}
  />
)}

      {page === 'mydonations' && user?.role === 'donor' && (
        <MyDonations goHome={() => setPage('home')} user={user} />
      )}

      {page === 'findfood' && user && (
        <FindFood goHome={() => setPage('home')} />
      )}

      {page === 'requests' && user && (
        <MyCollectionRequests
          goHome={() => setPage('home')}
          userRole={user.role}
        />
      )}
    </div>
  );
}

export default App;

