import { useState } from 'react'
import React from 'react';
import { STSClient, AssumeRoleWithWebIdentityCommand } from '@aws-sdk/client-sts';

// Add Google Fonts import to the document head
if (!document.getElementById('google-font-roboto')) {
  const link = document.createElement('link');
  link.id = 'google-font-roboto';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap';
  document.head.appendChild(link);
}

const appStyle = {
  fontFamily: 'Roboto, sans-serif',
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0',
  margin: '0',
};

const cardStyle = {
  background: '#fff',
  borderRadius: '16px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  padding: '2.5em 2em',
  minWidth: '340px',
  maxWidth: '90vw',
  marginTop: '2em',
  textAlign: 'center',
};

const buttonStyle = {
  background: 'linear-gradient(90deg, #4285F4 0%, #34A853 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '1.1em',
  fontWeight: '700',
  padding: '0.8em 2em',
  margin: '1.5em 0 0 0',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(66,133,244,0.15)',
  transition: 'background 0.2s',
};

const avatarStyle = {
  borderRadius: '50%',
  width: '64px',
  height: '64px',
  margin: '1em auto',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

function App() {
  const [user, setUser] = useState(null);
  const [awsCreds, setAwsCreds] = useState(null);
  const [consoleLoading, setConsoleLoading] = useState(false);

  async function getConsoleUrl(creds) {
    // Call backend proxy
    const resp = await fetch(import.meta.env.VITE_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creds),
    });
    const { loginUrl } = await resp.json();
    return loginUrl;
  }

  // Load Google Identity Services script
  React.useEffect(() => {
    if (window.google || document.getElementById('google-oauth')) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.id = 'google-oauth';
    script.onload = () => {
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async (response) => {
          // Decode JWT to get user info
          const base64Url = response.credential.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const userInfo = JSON.parse(jsonPayload);
          setUser(userInfo);

          // Call AWS STS AssumeRoleWithWebIdentity
          try {
            const client = new STSClient({ region: 'us-east-1' });
            const command = new AssumeRoleWithWebIdentityCommand({
              RoleArn: 'arn:aws:iam::307621978721:role/aws-ec2-access-role',
              RoleSessionName: 'google-oauth-session',
              WebIdentityToken: response.credential,
            });
            const awsResponse = await client.send(command);
            setAwsCreds(awsResponse.Credentials);
          } catch (err) {
            setAwsCreds({ error: err.message });
          }
        },
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-signin'),
        { theme: 'outline', size: 'large', width: 300 }
      );
    };
    document.body.appendChild(script);
  }, []);

  return (
    <div style={appStyle}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {user && awsCreds && !awsCreds.error && (
          <button
            style={buttonStyle}
            onClick={async () => {
              setConsoleLoading(true);
              const url = await getConsoleUrl(awsCreds);
              window.location.href = url;
            }}
            disabled={consoleLoading}
          >
            {consoleLoading ? 'Opening AWS Console...' : 'Open AWS Console'}
          </button>
        )}
        <div style={cardStyle}>
          {!user && (
            <>
              <h2 style={{ fontWeight: 700, marginBottom: '1.2em', color: '#222' }}>Sign in with Google</h2>
              <div id="google-signin" style={{ display: 'flex', justifyContent: 'center' }}></div>
            </>
          )}
          {user && (
            <>
              <img src={user.picture} alt="Profile" style={avatarStyle} />
              <h2 style={{ margin: '0.5em 0 0.2em 0', fontWeight: 700 }}>{user.name}</h2>
              <div style={{ color: '#666', fontSize: '1em', marginBottom: '1em' }}>{user.email}</div>
              <hr style={{ margin: '1.5em 0' }} />
              <h3 style={{ color: '#4285F4', margin: '0 0 1em 0', fontWeight: 700 }}>AWS Console Access</h3>
              {awsCreds ? (
                awsCreds.error ? (
                  <div style={{ color: 'red', fontWeight: 500 }}>Error: {awsCreds.error}</div>
                ) : null
              ) : (
                <div style={{ color: '#888' }}>Requesting AWS credentials...</div>
              )}
            </>
          )}
        </div>
      </div>
      <footer style={{ marginTop: '3em', color: '#888', fontSize: '0.95em' }}>
        Powered by Google OAuth2 & AWS Federation
      </footer>
    </div>
  );
}

export default App;
