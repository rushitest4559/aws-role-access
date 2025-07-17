// backend-proxy.js
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch'; // npm install node-fetch@2
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/federation-url', async (req, res) => {
  const { AccessKeyId, SecretAccessKey, SessionToken } = req.body;
  if (!AccessKeyId || !SecretAccessKey || !SessionToken) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  try {
    const sessionJson = JSON.stringify({
      sessionId: AccessKeyId,
      sessionKey: SecretAccessKey,
      sessionToken: SessionToken,
    });
    const tokenResp = await fetch(
      `https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=${encodeURIComponent(sessionJson)}`
    );
    const { SigninToken } = await tokenResp.json();
    const destination = encodeURIComponent('https://console.aws.amazon.com/');
    const loginUrl = `https://signin.aws.amazon.com/federation?Action=login&Issuer=example.com&Destination=${destination}&SigninToken=${SigninToken}`;
    res.json({ loginUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend is running' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Federation proxy running on port ${PORT}`)); 