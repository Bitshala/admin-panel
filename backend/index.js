// server.js
const express  = require('express');
const fetch    = require('node-fetch');
const { Octokit } = require('@octokit/rest');
const multer   = require('multer');
const cors     = require('cors');
const fs       = require('fs');
const fsp      = fs.promises;              // promises API for cleanup
const path     = require('path');
require('dotenv').config();

const { cloneRepoToDocuments } = require('./cloneRepo');
const { runTests }            = require('./runCode');

const app        = express();
const OUTPUT_DIR = path.join(__dirname, 'outputs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/outputs', express.static(OUTPUT_DIR));

const storage = multer.memoryStorage();
const upload  = multer({ storage });

const { CLIENT_ID, CLIENT_SECRET, GITHUB_TOKEN } = process.env;


app.get('/login', (req, res) => {
  const url =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=http://localhost:3000/oauth/callback` +
    '&scope=repo,admin:org';
  res.redirect(url);
});

// server.js
app.get('/oauth/callback', async (req, res) => {
  // 1. swap the code for an access_token
  const ghRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code:          req.query.code,
      redirect_uri:  'http://localhost:3000/oauth/callback',
    }),
  });

  const { access_token } = await ghRes.json();

  if (!access_token) {
    return res.status(400).send('GitHub did not return a token');
  }

  res.redirect(
    `http://localhost:5173/admin/#access_token=${encodeURIComponent(access_token)}`
  );
});



app.get('/api/classrooms', async (_, res) => {
  if (!GITHUB_TOKEN) return res.status(401).json({ error: 'Missing token' });
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const { data } = await octokit.request('GET /classrooms');
  res.json(data);
});


app.get('/download/:fname', (req, res) => {
  const file = path.join(OUTPUT_DIR, req.params.fname);
  if (!fs.existsSync(file)) return res.status(404).send('File not found');
  res.download(file);                       // sets Content‑Disposition
});


app.post('/api/clone', upload.single('file'), async (req, res) => {
  const { token, owner, repo, ref = 'main' } = req.body;
  if (!owner || !repo) {
    return res.status(400).json({ success: false, error: '`owner` and `repo` required' });
  }

  let clonePath;
  try {

    clonePath = await cloneRepoToDocuments(token, owner, repo, ref, req.file?.buffer);
    console.log('Cloned repo to:', clonePath);


    const testRes = await runTests(repo, ref);

  
    const filename = `${repo}-${ref}-${Date.now()}.txt`;
    const filePath = path.join(OUTPUT_DIR, filename);
    const logText  =
      typeof testRes === 'string'
        ? testRes
        : (testRes.stdout ?? JSON.stringify(testRes, null, 2));
    fs.writeFileSync(filePath, logText);

 
    if (clonePath) {
      await fsp.rm(clonePath, { recursive: true, force: true });
      console.log('🧹  Removed temp clone:', clonePath);
    }

    res.json({
      success: true,
      testRes,
      downloadUrl: `/download/${filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message ?? 'Internal error' });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API listening at http://localhost:${PORT}`));
