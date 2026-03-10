import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLIENT_ID = 'SEARCHADS.5fbfffa0-9170-4426-a631-f6f2fcd3ba33';
const TEAM_ID = 'SEARCHADS.5fbfffa0-9170-4426-a631-f6f2fcd3ba33';
const KEY_ID = 'f245f52b-d027-47a4-961d-df7cf8289839';
const ORG_ID = '19861990';
const PRIVATE_KEY_PATH = path.join(__dirname, 'private-key.pem');
const API_BASE = 'https://api.searchads.apple.com/api/v5';
const TOKEN_URL = 'https://appleid.apple.com/auth/oauth2/token';

const CAMPAIGN_ID = '2143420950';
const AG1_CATEGORY = '2145739179';
const AG3_CONTRACTOR = '2145737312';

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateClientSecret() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: KEY_ID };
  const payload = { sub: CLIENT_ID, aud: 'https://appleid.apple.com', iat: now, exp: now + 86400, iss: TEAM_ID };
  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encHeader}.${encPayload}`;
  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const sig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${base64url(sig)}`;
}

async function getAccessToken() {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: generateClientSecret(),
    scope: 'searchadsorg'
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });
  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function addKeywords(token, campaignId, adGroupId, keywords) {
  const body = keywords.map(kw => ({
    text: kw.text,
    matchType: 'EXACT',
    status: 'ACTIVE',
    bidAmount: { amount: String(kw.bid), currency: 'USD' }
  }));
  const res = await fetch(`${API_BASE}/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-AP-Context': `orgId=${ORG_ID}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Add keywords failed ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  console.log('Authenticating...');
  const token = await getAccessToken();
  console.log('Authenticated.\n');

  // New keywords for AG1 - Category Estimate Keywords
  const ag1Keywords = [
    { text: 'business invoices', bid: 2.00 },          // Pop 28, Comp 64 - Jobber weak at 191
    { text: 'joist app for contractors', bid: 1.50 },   // Pop 29, Comp 48 - conquest, very low comp
    { text: 'handyman service app', bid: 1.80 },        // Pop 25, Comp 51 - low comp high relevance
  ];

  // New keywords for AG3 - Exact Contractor Intent
  const ag3Keywords = [
    { text: 'contractor foreman', bid: 2.00 },          // Pop 31, Comp 60 - Jobber #5 conquest
    { text: 'framing calculator', bid: 1.50 },           // Pop 18, Comp 54 - OnSite has this calc
    { text: 'construction timesheet', bid: 1.00 },       // Pop 5, Comp 29 - cheapest keyword in set
  ];

  console.log('Adding 3 keywords to AG1 (Category - Estimate Keywords)...');
  try {
    const r1 = await addKeywords(token, CAMPAIGN_ID, AG1_CATEGORY, ag1Keywords);
    const added1 = r1.data?.filter(k => k.id) || [];
    console.log(`  Added ${added1.length} keywords:`);
    ag1Keywords.forEach(kw => console.log(`    "${kw.text}" — $${kw.bid}`));
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  console.log('\nAdding 3 keywords to AG3 (Exact - Contractor Intent)...');
  try {
    const r2 = await addKeywords(token, CAMPAIGN_ID, AG3_CONTRACTOR, ag3Keywords);
    const added2 = r2.data?.filter(k => k.id) || [];
    console.log(`  Added ${added2.length} keywords:`);
    ag3Keywords.forEach(kw => console.log(`    "${kw.text}" — $${kw.bid}`));
  } catch (e) {
    console.log(`  Error: ${e.message}`);
  }

  console.log('\nDone. Campaign still PAUSED — run "node manage-campaigns.mjs enable 2143420950" to go live.');
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
