'use client';

import React, { useState } from 'react';

export default function ContactPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (message.length > 5000) {
      setError('Message is too long (max 5000 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Email: ${email}\n\n${message}` })
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to submit message');
      }

      setSuccess(true);
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Contact Us</h1>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Get in Touch</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '20px' }}>
          We'd love to hear from you! Whether you have questions, feedback, or suggestions,
          feel free to reach out to us.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor='contact-email'
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151'
              }}
            >
              Email
            </label>
            <input
              type='email'
              id='contact-email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='your.email@example.com'
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '1rem',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label
              htmlFor='contact-message'
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: '#374151'
              }}
            >
              Message
            </label>
            <textarea
              id='contact-message'
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Tell us how we can help or share your feedback...'
              rows={8}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {message.length} / 5000 characters
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.75rem',
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 6,
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '0.75rem',
              background: '#d1fae5',
              color: '#065f46',
              borderRadius: 6,
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              Your message was received! We will respond very soon.
            </div>
          )}

          <button
            type='submit'
            disabled={isSubmitting}
            style={{
              padding: '0.75rem 1.5rem',
              background: isSubmitting ? '#93c5fd' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '1rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = '#3b82f6';
            }}
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}

