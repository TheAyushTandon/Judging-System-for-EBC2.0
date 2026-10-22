'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import StreamlineIcon from '@/components/icons/StreamlineIcons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cardRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const token = document.cookie.match(/token=([^;]+)/);
    const userData = localStorage.getItem('ebc2_user');
    if (token && userData) {
      const user = JSON.parse(userData);
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/judge');
      }
      return;
    }

    // Animate card in
    const timer = setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.classList.add('visible');
      }
    }, 100);

    // Subtle particles in soft palm-leaf and beige
    import('animejs').then((anime) => {
      const animeDefault = anime.default || anime;
      createParticles(animeDefault);
    }).catch(() => {});

    return () => clearTimeout(timer);
  }, [router]);

  function createParticles(anime) {
    const container = document.querySelector('.animated-bg');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['rgba(137, 152, 120, 0.25)', 'rgba(228, 230, 195, 0.45)', 'rgba(34, 39, 37, 0.08)'];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: ${Math.random() * 6 + 3}px;
        height: ${Math.random() * 6 + 3}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
      `;
      container.appendChild(particle);

      anime({
        targets: particle,
        translateX: () => anime.random(-60, 60),
        translateY: () => anime.random(-60, 60),
        opacity: [
          { value: 0.1, duration: 1500 },
          { value: 0.4, duration: 1500 },
          { value: 0.1, duration: 1500 },
        ],
        duration: anime.random(5000, 9000),
        loop: true,
        easing: 'easeInOutSine',
        delay: anime.random(0, 2000),
      });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);

        // Shake animation on error
        import('animejs').then((anime) => {
          const animeDefault = anime.default || anime;
          animeDefault({
            targets: cardRef.current,
            translateX: [-8, 8, -6, 6, -3, 3, 0],
            duration: 400,
            easing: 'easeInOutSine',
          });
        }).catch(() => {});
        return;
      }

      // Save user data
      localStorage.setItem('ebc2_user', JSON.stringify(data.user));
      localStorage.setItem('ebc2_token', data.token);

      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/judge');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card" ref={cardRef}>
        <div className="login-card-header">
          <div className="login-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <StreamlineIcon name="trophy" size={13} />
            <span>EBC 2.0 • Evaluation Portal</span>
          </div>
          <h1 className="login-title">Sign In</h1>
          <p className="login-subtitle">
            Enterprise Business Challenge 2.0 Judging System
          </p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="Enter authorization password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Enter System →'}
          </button>
        </form>
      </div>
    </div>
  );
}
