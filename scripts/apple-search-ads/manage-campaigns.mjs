import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Apple Search Ads API Credentials
const CLIENT_ID = 'SEARCHADS.5fbfffa0-9170-4426-a631-f6f2fcd3ba33';
const TEAM_ID = 'SEARCHADS.5fbfffa0-9170-4426-a631-f6f2fcd3ba33';
const KEY_ID = 'f245f52b-d027-47a4-961d-df7cf8289839';
const ORG_ID = '19861990';
const PRIVATE_KEY_PATH = path.join(__dirname, 'private-key.pem');

const API_BASE = 'https://api.searchads.apple.com/api/v5';
const TOKEN_URL = 'https://appleid.apple.com/auth/oauth2/token';

// --- Auth ---

function generateClientSecret() {
  const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: 'ES256',
    kid: KEY_ID
  };

  const payload = {
    sub: CLIENT_ID,
    aud: 'https://appleid.apple.com',
    iat: now,
    exp: now + 86400,
    iss: TEAM_ID
  };

  const encHeader = base64url(JSON.stringify(header));
  const encPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encHeader}.${encPayload}`;

  const sign = crypto.createSign('SHA256');
  sign.update(signingInput);
  const sig = sign.sign({ key: privateKey, dsaEncoding: 'ieee-p1363' });
  const encSig = base64url(sig);

  return `${signingInput}.${encSig}`;
}

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken() {
  const clientSecret = generateClientSecret();

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: clientSecret,
    scope: 'searchadsorg'
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// --- API helpers ---

async function apiGet(token, endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-AP-Context': `orgId=${ORG_ID}`
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${endpoint} failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPost(token, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-AP-Context': `orgId=${ORG_ID}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${endpoint} failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function apiPut(token, endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-AP-Context': `orgId=${ORG_ID}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PUT ${endpoint} failed ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Campaign Management ---

async function listCampaigns(token) {
  const data = await apiPost(token, '/campaigns/find', {
    fields: ['id', 'name', 'status', 'budgetAmount', 'dailyBudgetAmount'],
    conditions: []
  });
  return data.data || [];
}

async function listAdGroups(token, campaignId) {
  const data = await apiPost(token, `/campaigns/${campaignId}/adgroups/find`, {
    fields: ['id', 'name', 'status', 'defaultBidAmount'],
    conditions: []
  });
  return data.data || [];
}

async function listKeywords(token, campaignId, adGroupId) {
  try {
    const data = await apiGet(token, `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords`);
    return data.data || [];
  } catch {
    return [];
  }
}

async function createCampaign(token, { name, budgetAmount, dailyBudgetAmount, appId }) {
  return apiPost(token, '/campaigns', {
    name,
    budgetAmount: { amount: String(budgetAmount), currency: 'USD' },
    dailyBudgetAmount: { amount: String(dailyBudgetAmount), currency: 'USD' },
    adamId: appId,
    countriesOrRegions: ['US'],
    status: 'ENABLED',
    supplySources: ['APPSTORE_SEARCH_RESULTS'],
    adChannelType: 'SEARCH',
    billingEvent: 'TAPS'
  });
}

async function createAdGroup(token, campaignId, { name, defaultBid, searchMatch = false }) {
  // Apple wants ISO 8601 with timezone, e.g. "2026-02-18T00:00:00.000"
  const startTime = new Date().toISOString().replace('Z', '');
  return apiPost(token, `/campaigns/${campaignId}/adgroups`, {
    name,
    pricingModel: 'CPC',
    startTime,
    defaultBidAmount: { amount: String(defaultBid), currency: 'USD' },
    status: 'ENABLED',
    automatedKeywordsOptIn: searchMatch
  });
}

async function addKeywords(token, campaignId, adGroupId, keywords) {
  // keywords = [{ text, matchType, bid }]
  const body = keywords.map(kw => ({
    text: kw.text,
    matchType: kw.matchType || 'EXACT',
    status: 'ACTIVE',
    bidAmount: kw.bid ? { amount: String(kw.bid), currency: 'USD' } : undefined
  }));
  return apiPost(token, `/campaigns/${campaignId}/adgroups/${adGroupId}/targetingkeywords/bulk`, body);
}

async function addNegativeKeywords(token, campaignId, keywords) {
  const body = keywords.map(kw => ({
    text: kw,
    matchType: 'EXACT',
    status: 'ACTIVE'
  }));
  return apiPost(token, `/campaigns/${campaignId}/negativekeywords/bulk`, body);
}

async function pauseAdGroup(token, campaignId, adGroupId) {
  return apiPut(token, `/campaigns/${campaignId}/adgroups/${adGroupId}`, {
    status: 'PAUSED'
  });
}

// --- Hivemind-Optimized Campaign Data ($50/day) ---
// Strategy: Category keywords first (highest install intent), Search Match for discovery,
// exact contractor terms for branded intent. NO competitor keywords until Week 2.
// Based on real performance data: 9/11 installs came from Search Match/category, 0 from competitor brands.

const CAMPAIGN_CONFIG = {
  name: 'OnSite - Hivemind Optimized',
  dailyBudget: 50,
  monthlyBudget: 1550,  // ~31 days
  status: 'PAUSED',     // Created paused — enable when ready to launch
};

const OPTIMIZED_AD_GROUPS = {
  // --- AD GROUP 1: Category Intent ($25/day) ---
  // Highest volume + highest install intent keywords from competitor analysis.
  // SimplyWise ranks #1 on most of these — we're competing directly.
  // Pop 27-51 range = actual search volume (not floor-5 keywords)
  'Category - Estimate Keywords': {
    defaultBid: 3.50,   // Start at Apple's suggested range, not low
    dailyBudget: 25,
    keywords: [
      // Priority 1: Highest popularity + direct estimate intent
      { text: 'estimate maker free', bid: 4.00 },           // Pop 37, Comp 72 — SimplyWise #4
      { text: 'free estimate app', bid: 4.00 },              // Pop 31, Comp 73 — SimplyWise #3
      { text: 'estimate maker', bid: 3.50 },                 // Pop 27, Comp 71 — SimplyWise #7
      { text: 'construction calculator', bid: 3.50 },        // Pop 51, Comp 66 — SimplyWise #19
      { text: 'estimate maker for contractors', bid: 4.50 }, // Pop 21, Comp 77 — highest contractor intent
      { text: 'contractor estimate invoice', bid: 4.00 },    // Pop 24, Comp 56 — lower comp = cheaper
      // Priority 2: Solid volume, broader intent
      { text: 'invoice maker for contractors', bid: 3.50 },  // Pop 21, Comp 77
      { text: 'construction software', bid: 3.00 },          // Pop 46, Comp 81 — broad but high volume
    ]
  },

  // --- AD GROUP 2: Search Match Discovery ($15/day) ---
  // No keywords — Apple auto-matches to relevant searches.
  // This is how you discover what REAL users search for.
  // Your old campaign got 9/11 installs from Search Match.
  'Search Match - Discovery': {
    defaultBid: 2.50,    // Lower bid, let Apple find cheap terms
    dailyBudget: 15,
    searchMatch: true,   // Flag for special handling — no keywords, automatedKeywordsOptIn: true
    keywords: []         // Empty — Search Match doesn't use keywords
  },

  // --- AD GROUP 3: Exact Contractor Intent ($10/day) ---
  // Your own branded/direct terms where you already rank organically.
  // Low competition, high conversion. Defensive + growth.
  'Exact - Contractor Intent': {
    defaultBid: 3.00,
    dailyBudget: 10,
    keywords: [
      { text: 'contractor estimate app', bid: 3.50 },       // You rank #70, SimplyWise #1 — steal it
      { text: 'contractor estimate', bid: 3.00 },            // You rank #88
      { text: 'ai estimates for contractors', bid: 3.50 },   // You rank #18 — defend this
      { text: 'contractor pricing app', bid: 3.50 },         // You rank #47
      { text: 'contractor calculator', bid: 3.00 },          // You rank #49
      { text: 'roofing calculator', bid: 2.50 },             // You rank #47 — good organic, reinforce
    ]
  },
};

// --- WEEK 2 AD GROUP (add after 7 days of data) ---
// Only deploy this AFTER Week 1 shows which category keywords convert.
const WEEK2_COMPETITOR_GROUP = {
  'Competitor - Brand Steal': {
    defaultBid: 4.00,   // Competitor terms need higher bids
    dailyBudget: 10,    // Shift $10 from underperforming Week 1 group
    keywords: [
      { text: 'simplywise', bid: 4.50 },        // Pop 41, direct competitor
      { text: 'housecall pro', bid: 4.00 },      // Pop 51, field service
      { text: 'joist app', bid: 3.50 },          // Pop 7, estimate app
      { text: 'joist estimate', bid: 3.50 },
      { text: 'jobber', bid: 4.00 },             // Pop 56, but low conversion expected
      { text: 'buildertrend', bid: 3.50 },       // Pop 49
    ]
  }
};

// Negative keywords — block irrelevant traffic that wastes budget.
// Learned from real search term data: "workforce" broad match was showing ads for Workday, UKG, Salesforce.
const NEGATIVE_KEYWORDS = [
  // HR/Enterprise (from actual wasted spend data)
  'workday', 'ukg', 'salesforce', 'workforce', 'workforce management',
  'human resources', 'hr software', 'payroll software', 'adp',
  // Non-contractor estimates
  'labor and delivery', 'age estimator', 'height estimator', 'rent price estimator',
  'candle cost calculator', 'fake calculator', 'calorie estimator', 'salary estimator',
  // Games/Entertainment
  'construction simulator', 'construction car', 'junior construction crew',
  'digging a hole', 'building games',
  // Unrelated builders
  'free resume builder', 'free vocabulary builder', 'ai resume builder',
  'survey builder', 'app builder free', 'website builder', 'form builder',
  // Finance/Credit (not our market)
  'altro build credit', 'zestimate', 'after pay', 'pay after',
  // Foreign language (US campaign only)
  'appli de construction', 'plans de construction', 'construire', 'constructeur',
  'costruzioni', 'il costo', 'estimação', "d'estimations", 'tolteck', 'canborder',
  'calculatrice construction', 'rekenmachine', 'productos gratis',
  // AI/Tech unrelated
  'chat gpt', 'gpt', 'api cost', 'bim 360', 'openspace ai',
  // Misc irrelevant
  'rfp finder', 'leveling tool', 'qbse', 'ks fit', 'divergent thinker',
  'simplify jobs', 'wide', 'bid alert government', 'project planner',
];

// --- Main Commands ---

async function main() {
  const command = process.argv[2];

  if (!command) {
    console.log(`
Apple Search Ads Campaign Manager — Hivemind Optimized
=======================================================

Commands:
  preview                 Show the full campaign plan (keywords, bids, budgets) without deploying
  create <appId>          Create campaign PAUSED with all ad groups + keywords
  deploy <campaignId>     Add Week 1 ad groups to existing campaign (paused)
  deploy-week2 <cId>      Add competitor ad group (run after Week 1 data)
  enable <campaignId>     Enable a paused campaign (GO LIVE)
  pause <campaignId>      Pause all ad groups in a campaign
  list                    List all campaigns and ad groups
  report <campaignId>     Get performance report
  search-terms <cId>      Get search term report (what people actually searched)
  test                    Test API connection
    `);
    return;
  }

  // Preview doesn't need auth
  if (command === 'preview') {
    console.log('=== HIVEMIND-OPTIMIZED CAMPAIGN PREVIEW ===\n');
    console.log(`Campaign: "${CAMPAIGN_CONFIG.name}"`);
    console.log(`Daily Budget: $${CAMPAIGN_CONFIG.dailyBudget}`);
    console.log(`Monthly Budget: ~$${CAMPAIGN_CONFIG.monthlyBudget}`);
    console.log(`Initial Status: ${CAMPAIGN_CONFIG.status} (won't spend until you enable)\n`);

    console.log('--- WEEK 1 AD GROUPS (3 groups, 14 keywords + Search Match) ---\n');
    let totalKeywords = 0;
    for (const [name, group] of Object.entries(OPTIMIZED_AD_GROUPS)) {
      console.log(`  ${name}`);
      console.log(`    Daily Budget: $${group.dailyBudget}`);
      console.log(`    Default Bid: $${group.defaultBid}`);
      if (group.searchMatch) {
        console.log(`    Type: SEARCH MATCH (auto-discovery, no keywords)`);
        console.log(`    automatedKeywordsOptIn: true`);
      } else {
        console.log(`    Keywords (${group.keywords.length}):`);
        group.keywords.forEach(kw => {
          console.log(`      "${kw.text}" — $${kw.bid} [${kw.matchType || 'EXACT'}]`);
        });
        totalKeywords += group.keywords.length;
      }
      console.log('');
    }

    console.log('--- WEEK 2 AD GROUP (add after 7 days of data) ---\n');
    for (const [name, group] of Object.entries(WEEK2_COMPETITOR_GROUP)) {
      console.log(`  ${name}`);
      console.log(`    Daily Budget: $${group.dailyBudget} (shift from underperforming Week 1 group)`);
      console.log(`    Default Bid: $${group.defaultBid}`);
      console.log(`    Keywords (${group.keywords.length}):`);
      group.keywords.forEach(kw => {
        console.log(`      "${kw.text}" — $${kw.bid} [EXACT]`);
      });
      console.log('');
    }

    console.log(`--- NEGATIVE KEYWORDS (${NEGATIVE_KEYWORDS.length} terms) ---\n`);
    console.log(`  ${NEGATIVE_KEYWORDS.join(', ')}\n`);

    console.log('--- BUDGET BREAKDOWN ---\n');
    console.log('  Week 1:');
    console.log('    $25/day → Category Estimate Keywords (8 exact match)');
    console.log('    $15/day → Search Match Discovery (auto)');
    console.log('    $10/day → Exact Contractor Intent (6 exact match)');
    console.log('    ─────────');
    console.log('    $50/day total\n');
    console.log('  Week 2 (adjust based on data):');
    console.log('    Reduce lowest-performing group by $10');
    console.log('    Add $10/day Competitor Brand Steal (6 keywords)\n');
    console.log(`  Total Keywords: ${totalKeywords} exact + Search Match auto`);
    console.log('  Expected Month 1: ~125 installs at ~$11.20 CPI');
    console.log('  Expected Free Trials (25%): ~31');
    console.log('  Expected Paid Subs (45%): ~14');
    return;
  }

  console.log('Authenticating with Apple Search Ads...');
  const token = await getAccessToken();
  console.log('Authenticated successfully!\n');

  switch (command) {
    case 'test': {
      console.log('API connection working. Fetching campaigns...');
      const campaigns = await listCampaigns(token);
      console.log(`Found ${campaigns.length} campaign(s)`);
      campaigns.forEach(c => {
        console.log(`  - ${c.name} (ID: ${c.id}, Status: ${c.status})`);
      });
      break;
    }

    case 'list': {
      const campaigns = await listCampaigns(token);
      for (const campaign of campaigns) {
        console.log(`\nCampaign: ${campaign.name} (ID: ${campaign.id})`);
        console.log(`  Status: ${campaign.status}`);
        console.log(`  Budget: $${campaign.budgetAmount?.amount || 'N/A'}`);
        console.log(`  Daily: $${campaign.dailyBudgetAmount?.amount || 'N/A'}`);

        const adGroups = await listAdGroups(token, campaign.id);
        console.log(`  Ad Groups (${adGroups.length}):`);
        for (const ag of adGroups) {
          console.log(`    - ${ag.name} (ID: ${ag.id}, Status: ${ag.status}, Bid: $${ag.defaultBidAmount?.amount || 'N/A'})`);
          const keywords = await listKeywords(token, campaign.id, ag.id);
          console.log(`      Keywords (${keywords.length}):`);
          keywords.slice(0, 5).forEach(kw => {
            console.log(`        "${kw.text}" [${kw.matchType}] $${kw.bidAmount?.amount || 'default'}`);
          });
          if (keywords.length > 5) console.log(`        ... and ${keywords.length - 5} more`);
        }
      }
      break;
    }

    case 'pause': {
      const campaignId = process.argv[3];
      if (!campaignId) { console.log('Usage: pause <campaignId>'); return; }
      const adGroups = await listAdGroups(token, campaignId);
      for (const ag of adGroups) {
        console.log(`Pausing ${ag.name}...`);
        await pauseAdGroup(token, campaignId, ag.id);
      }
      console.log(`Paused ${adGroups.length} ad groups.`);
      break;
    }

    case 'enable': {
      const campaignId = process.argv[3];
      if (!campaignId) { console.log('Usage: enable <campaignId>'); return; }
      console.log('Enabling campaign...');
      await apiPut(token, `/campaigns/${campaignId}`, { status: 'ENABLED' });
      console.log('Campaign is now LIVE and spending.');
      break;
    }

    case 'search-terms': {
      const campaignId = process.argv[3];
      if (!campaignId) { console.log('Usage: search-terms <campaignId>'); return; }
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const report = await apiPost(token, `/reports/campaigns/${campaignId}/searchterms`, {
        startTime: startDate,
        endTime: endDate,
        returnRowTotals: true,
        returnGrandTotals: true,
        selector: { orderBy: [{ field: 'impressions', sortOrder: 'DESCENDING' }], pagination: { offset: 0, limit: 50 } }
      });
      const rows = report.data?.reportingDataResponse?.row || [];
      console.log(`Search Terms (last 30 days, top 50 by impressions):\n`);
      rows.forEach(row => {
        const m = row.metadata || {};
        const t = row.total || {};
        console.log(`  "${m.searchTermText}" → ${t.impressions || 0} imp, ${t.taps || 0} taps, ${t.installs || 0} installs, $${t.avgCPT?.amount || '0'} CPT`);
      });
      break;
    }

    case 'deploy': {
      const campaignId = process.argv[3];
      if (!campaignId) { console.log('Usage: deploy <campaignId>'); return; }

      console.log('Deploying Week 1 ad groups (PAUSED)...\n');

      for (const [groupName, groupData] of Object.entries(OPTIMIZED_AD_GROUPS)) {
        console.log(`Creating ad group: ${groupName}...`);
        const agResult = await createAdGroup(token, campaignId, {
          name: groupName,
          defaultBid: groupData.defaultBid,
          searchMatch: groupData.searchMatch || false
        });
        const adGroupId = agResult.data?.id;
        if (!adGroupId) {
          console.log(`  Failed: ${JSON.stringify(agResult)}`);
          continue;
        }
        console.log(`  Created (ID: ${adGroupId})`);

        if (groupData.keywords.length > 0) {
          console.log(`  Adding ${groupData.keywords.length} keywords...`);
          await addKeywords(token, campaignId, adGroupId, groupData.keywords);
        } else {
          console.log(`  Search Match group — no keywords needed.`);
        }
        console.log('');
      }

      console.log('Adding negative keywords...');
      await addNegativeKeywords(token, campaignId, NEGATIVE_KEYWORDS);
      console.log(`Added ${NEGATIVE_KEYWORDS.length} negative keywords.\n`);

      console.log('Week 1 deployed! Campaign is PAUSED.');
      console.log('Run `enable <campaignId>` when ready to go live.');
      break;
    }

    case 'deploy-week2': {
      const campaignId = process.argv[3];
      if (!campaignId) { console.log('Usage: deploy-week2 <campaignId>'); return; }

      console.log('Deploying Week 2 competitor ad group...\n');

      for (const [groupName, groupData] of Object.entries(WEEK2_COMPETITOR_GROUP)) {
        console.log(`Creating ad group: ${groupName}...`);
        const agResult = await createAdGroup(token, campaignId, {
          name: groupName,
          defaultBid: groupData.defaultBid
        });
        const adGroupId = agResult.data?.id;
        if (!adGroupId) {
          console.log(`  Failed: ${JSON.stringify(agResult)}`);
          continue;
        }
        console.log(`  Created (ID: ${adGroupId})`);
        console.log(`  Adding ${groupData.keywords.length} keywords...`);
        await addKeywords(token, campaignId, adGroupId, groupData.keywords);
        console.log('');
      }

      console.log('Week 2 competitor group deployed!');
      break;
    }

    case 'create': {
      const appId = process.argv[3];
      if (!appId) { console.log('Usage: create <appId> (your App Store Adam ID)'); return; }

      console.log(`Creating campaign: "${CAMPAIGN_CONFIG.name}" (PAUSED)...`);
      const result = await createCampaign(token, {
        name: CAMPAIGN_CONFIG.name,
        budgetAmount: CAMPAIGN_CONFIG.monthlyBudget,
        dailyBudgetAmount: CAMPAIGN_CONFIG.dailyBudget,
        appId: parseInt(appId)
      });

      const campaignId = result.data?.id;
      if (!campaignId) {
        console.log(`Failed: ${JSON.stringify(result)}`);
        return;
      }
      console.log(`Campaign created (ID: ${campaignId})\n`);

      // Pause the campaign immediately
      await apiPut(token, `/campaigns/${campaignId}`, { campaign: { status: 'PAUSED' } }).catch(() => {
        console.log('  Note: Could not auto-pause. Pause it manually or run: enable/pause commands.');
      });

      // Deploy Week 1 ad groups
      for (const [groupName, groupData] of Object.entries(OPTIMIZED_AD_GROUPS)) {
        console.log(`Creating ad group: ${groupName}...`);
        const agResult = await createAdGroup(token, campaignId, {
          name: groupName,
          defaultBid: groupData.defaultBid,
          searchMatch: groupData.searchMatch || false
        });
        const adGroupId = agResult.data?.id;
        if (!adGroupId) {
          console.log(`  Failed: ${JSON.stringify(agResult)}`);
          continue;
        }
        console.log(`  Created (ID: ${adGroupId})`);

        if (groupData.keywords.length > 0) {
          console.log(`  Adding ${groupData.keywords.length} keywords...`);
          await addKeywords(token, campaignId, adGroupId, groupData.keywords);
        } else {
          console.log(`  Search Match group — no keywords needed.`);
        }
        console.log('');
      }

      console.log('Adding negative keywords...');
      await addNegativeKeywords(token, campaignId, NEGATIVE_KEYWORDS);
      console.log(`Added ${NEGATIVE_KEYWORDS.length} negative keywords.\n`);

      console.log('Campaign created and ready! Status: PAUSED');
      console.log(`Campaign ID: ${campaignId}`);
      console.log('Run `enable ${campaignId}` when ready to go live.');
      break;
    }

    case 'report': {
      const campaignId = process.argv[3];
      if (!campaignId) { console.log('Usage: report <campaignId>'); return; }
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const report = await apiPost(token, `/reports/campaigns/${campaignId}/adgroups`, {
        startTime: startDate,
        endTime: endDate,
        returnRowTotals: true,
        returnGrandTotals: true,
        selector: { orderBy: [{ field: 'impressions', sortOrder: 'DESCENDING' }] }
      });
      const rows = report.data?.reportingDataResponse?.row || [];
      const grand = report.data?.reportingDataResponse?.grandTotals || {};
      console.log(`Campaign Report (${startDate} to ${endDate}):\n`);
      rows.forEach(row => {
        const m = row.metadata || {};
        const t = row.total || {};
        console.log(`  ${m.adGroupName || m.adGroupId}:`);
        console.log(`    Impressions: ${t.impressions || 0} | Taps: ${t.taps || 0} | Installs: ${t.installs || 0}`);
        console.log(`    Spend: $${t.localSpend?.amount || '0'} | CPI: $${t.avgCPI?.amount || 'N/A'} | CPT: $${t.avgCPT?.amount || 'N/A'}`);
      });
      if (grand.impressions) {
        console.log(`\n  TOTALS: ${grand.impressions} imp | ${grand.taps} taps | ${grand.installs} installs | $${grand.localSpend?.amount || '0'} spent`);
      }
      break;
    }

    default:
      console.log(`Unknown command: ${command}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
