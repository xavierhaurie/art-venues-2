import React from 'react';

export const metadata = {
  title: 'Privacy Policy - Art Venues',
  description: 'Privacy Policy for Art Venues application',
};

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>

      <div
        className="getterms-document-embed"
        data-getterms="5LWll"
        data-getterms-document="privacy-policy"
        data-getterms-lang="en-us"
        data-getterms-mode="direct"
        data-getterms-env="https://gettermscdn.com"
      ></div>

      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{
          __html: `
            (function(d, s, id) { 
              var js, ref = d.getElementsByTagName(s)[0]; 
              if (d.getElementById(id)) return; 
              js = d.createElement(s); 
              js.id = id; 
              js.src = "https://gettermscdn.com/dist/js/embed.js"; 
              ref.parentNode.insertBefore(js, ref); 
            })(document, "script", "getterms-embed-js");
          `
        }}
      />
    </div>
  );
}

