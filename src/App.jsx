import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import React from 'react';
import { STSClient, AssumeRoleWithWebIdentityCommand } from '@aws-sdk/client-sts';

function App() {
  const [user, setUser] = useState(null);
  const [awsCreds, setAwsCreds] = useState(null);
  const [consoleLoading, setConsoleLoading] = useState(false);

  async function getConsoleUrl(creds) {
    // Call backend proxy
    const resp = await fetch('http://localhost:3001/federation-url', {
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
        client_id: '705271398400-uharb9v8f6bp86ggccpbf4uahmorh31o.apps.googleusercontent.com', // <-- REPLACE THIS
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
        { theme: 'outline', size: 'large' }
      );
    };
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        {user ? (
          <div>
            <h2>Welcome, {user.name}</h2>
            <p>Email: {user.email}</p>
            <img src={user.picture} alt="Profile" style={{ borderRadius: '50%' }} />
            <hr />
            <h3>AWS Console Access</h3>
            {awsCreds ? (
              awsCreds.error ? (
                <div style={{ color: 'red' }}>Error: {awsCreds.error}</div>
              ) : (
                <button
                  onClick={async () => {
                    setConsoleLoading(true);
                    const url = await getConsoleUrl(awsCreds);
                    window.location.href = url;
                  }}
                  disabled={consoleLoading}
                  style={{ fontSize: '1.2em', padding: '0.5em 1.5em', marginTop: '1em' }}
                >
                  {consoleLoading ? 'Opening Console...' : 'Open AWS Console'}
                </button>
              )
            ) : (
              <div>Requesting AWS credentials...</div>
            )}
          </div>
        ) : (
          <div id="google-signin"></div>
        )}
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
