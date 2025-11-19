import React from 'react';

export const metadata = {
  title: 'About - Art Venues',
  description: 'About Art Venues application',
};

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>About Art Venues</h1>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Our Mission</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '15px' }}>
          Art Venues is dedicated to connecting artists and art enthusiasts with the vibrant
          cultural spaces in the Greater Boston area.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>What We Offer</h2>
        <ul style={{ fontSize: '1.1rem', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Comprehensive directory of art venues</li>
          <li>Detailed information about galleries, studios, and exhibition spaces</li>
          <li>User-generated notes and stickers for personalized organization</li>
          <li>Image galleries for each venue</li>
          <li>Easy-to-use filtering and search capabilities</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Contact</h2>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
          Have questions or feedback? We'd love to hear from you!
        </p>
      </section>
    </div>
  );
}

