'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #E5E7EB',
        padding: '24px 20px',
        marginTop: '40px',
        backgroundColor: '#FFFFFF'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}
      >
        <Link
          href="/about"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
          className="footer-link"
        >
          About
        </Link>

        <span style={{ color: '#E5E7EB' }}>•</span>

        <a
          href="/terms"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
          className="footer-link"
        >
          Terms of Service
        </a>

        <span style={{ color: '#E5E7EB' }}>•</span>

        <a
          href="/privacy"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
          className="footer-link"
        >
          Privacy Policy
        </a>

        <span style={{ color: '#E5E7EB' }}>•</span>

        <a
          href="/cookies"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
          className="footer-link"
        >
          Cookies
        </a>

        <span style={{ color: '#E5E7EB' }}>•</span>

        <a
          href="/acceptable-use"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
          className="footer-link"
        >
          Acceptable Use
        </a>

        <span style={{ color: '#E5E7EB' }}>•</span>

        <Link
          href="/contact"
          style={{
            color: '#6B7280',
            textDecoration: 'none',
            fontSize: '14px'
          }}
          className="footer-link"
        >
          Contact
        </Link>

        <span style={{ color: '#E5E7EB' }}>•</span>

        <span style={{ color: '#9CA3AF', fontSize: '14px' }}>
          © {new Date().getFullYear()} Mountaintop Software Builders LLC - DBA Mini List
        </span>
      </div>
      <style jsx>{`
        .footer-link:hover {
          color: #111827;
        }
      `}</style>
    </footer>
  );
}

