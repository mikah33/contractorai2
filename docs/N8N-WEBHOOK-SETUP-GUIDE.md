# 🔗 n8n Webhook Integration Guide

**Session:** persistent-session-contractorai2
**Agents:** developer-1-permanent, developer-2-permanent, integrator-permanent
**Date:** 2025-10-02
**Status:** ✅ **INTEGRATION COMPLETE**

---

## ✅ What Was Implemented:

### 1. **Enhanced Signup Form**
**File:** `src/pages/auth/SignupPage.tsx`

**New Fields Added:**
- ✅ Full Name (required)
- ✅ Company Name (required)
- ✅ Email (required)
- ✅ Phone Number (required)
- ✅ Password (required)
- ✅ Confirm Password (required)

### 2. **Updated Auth Store**
**File:** `src/stores/authStore.ts`

**Changes:**
- ✅ Added `SignUpMetadata` interface
- ✅ Updated `signUp()` function to accept metadata
- ✅ Integrated n8n webhook call after successful signup
- ✅ Sends registration data to webhook
- ✅ Graceful error handling (signup succeeds even if webhook fails)

### 3. **Webhook Integration**
**Webhook URL:** `https://contractorai.app.n8n.cloud/webhook/170d14a9-ace1-49cf-baab-49dd8aec1245`

**Data Sent to Webhook:**
```json
{
  "email": "user@example.com",
  "fullName": "John Doe",
  "companyName": "Acme Contractors",
  "phoneNumber": "+1234567890",
  "userId": "uuid-from-supabase",
  "timestamp": "2025-10-02T16:40:00.000Z",
  "source": "ContractorAI Web App"
}
```

### 4. **HTML Email Template**
**File:** `docs/N8N-WEBHOOK-EMAIL-TEMPLATE.html`

**Features:**
- ✅ Professional design with ContractorAI branding
- ✅ Responsive layout
- ✅ Shows all user registration details
- ✅ Color-coded sections
- ✅ Timestamp included
- ✅ Ready to use in n8n workflow

---

## 🔧 n8n Workflow Setup Instructions:

### Step 1: Create n8n Workflow

1. **Go to your n8n instance**
2. **Create new workflow**
3. **Add Webhook node** (already created at the URL above)

### Step 2: Configure Webhook Node

- **Method:** POST
- **Path:** `webhook/170d14a9-ace1-49cf-baab-49dd8aec1245`
- **Authentication:** None (public webhook)
- **Response:** Return success message

### Step 3: Add Email Node

**Add "Send Email" node after webhook:**

1. **Node Type:** Gmail, SendGrid, SMTP, or any email service
2. **To:** Your notification email (e.g., `admin@contractorai.com`)
3. **From:** `noreply@contractorai.com`
4. **Subject:** `🎉 New Registration - ContractorAI Web App`
5. **Email Type:** HTML
6. **HTML Body:** Use the template from `docs/N8N-WEBHOOK-EMAIL-TEMPLATE.html`

### Step 4: Map Template Variables

**Replace these placeholders in the HTML template:**

```
{{fullName}}      → {{ $json.fullName }}
{{companyName}}   → {{ $json.companyName }}
{{email}}         → {{ $json.email }}
{{phoneNumber}}   → {{ $json.phoneNumber }}
{{userId}}        → {{ $json.userId }}
{{timestamp}}     → {{ $json.timestamp }}
{{source}}        → {{ $json.source }}
```

**Example n8n mapping:**
```
Subject: 🎉 New Registration - {{ $json.companyName }}
To: admin@contractorai.com
HTML: [Paste HTML template with {{ $json.field }} replacements]
```

### Step 5: Activate Workflow

1. **Test the workflow** with sample data
2. **Activate** the workflow
3. **Done!** Now all signups will trigger email notifications

---

## 🧪 Testing Instructions:

### Test the Complete Flow:

1. **Open your website:** http://localhost:5174/
2. **Navigate to signup page**
3. **Fill in the form:**
   - Full Name: `John Doe`
   - Company Name: `Test Company`
   - Email: `test@example.com`
   - Phone Number: `+1234567890`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
4. **Click "Create Account"**
5. **Expected results:**
   - ✅ Supabase account created
   - ✅ Confirmation email sent to user
   - ✅ Webhook triggered
   - ✅ n8n workflow executes
   - ✅ Email notification sent to admin

---

## 📊 Data Flow:

```
User fills signup form
         ↓
Click "Create Account"
         ↓
Supabase creates auth user
         ↓
User metadata saved to Supabase
         ↓
Webhook POST to n8n
         ↓
n8n receives registration data
         ↓
n8n sends HTML email notification
         ↓
Admin receives "New Registration" email ✅
```

---

## 🔍 Troubleshooting:

### Webhook Not Firing?

**Check browser console (F12):**
```javascript
// You should see this in console:
Webhook notification failed: [error details]
```

**Common issues:**
- CORS error (should be fine for POST)
- Network timeout
- n8n workflow not activated

### Email Not Arriving?

1. **Check n8n workflow execution log**
2. **Verify email service credentials**
3. **Check spam folder**
4. **Test webhook manually:**

```bash
curl -X POST https://contractorai.app.n8n.cloud/webhook/170d14a9-ace1-49cf-baab-49dd8aec1245 \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "companyName": "Test Company",
    "phoneNumber": "+1234567890",
    "userId": "test-user-id",
    "timestamp": "2025-10-02T16:40:00.000Z",
    "source": "ContractorAI Web App"
  }'
```

### Signup Fails?

**The integration is designed to NOT fail signup if webhook fails:**
- User account is still created
- Webhook error is logged to console
- User can complete signup successfully

---

## 📧 Email Template Variables Reference:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `{{fullName}}` | John Doe | User's full name |
| `{{companyName}}` | Acme Contractors | Company name |
| `{{email}}` | john@acme.com | User's email |
| `{{phoneNumber}}` | +1234567890 | Phone number |
| `{{userId}}` | uuid-string | Supabase user ID |
| `{{timestamp}}` | 2025-10-02T16:40:00.000Z | Registration timestamp |
| `{{source}}` | ContractorAI Web App | Always this value |

---

## 🚀 Production Checklist:

- [ ] n8n workflow created
- [ ] Webhook configured at correct URL
- [ ] Email node added to workflow
- [ ] HTML template loaded
- [ ] Variables mapped correctly
- [ ] Workflow tested with sample data
- [ ] Workflow activated
- [ ] Test signup on staging
- [ ] Verify email arrives
- [ ] Ready for production! 🎉

---

## 📝 Next Steps:

### Optional Enhancements:

1. **Add Slack notification** (n8n Slack node)
2. **Store in Google Sheets** (n8n Google Sheets node)
3. **Send to CRM** (n8n Salesforce/HubSpot node)
4. **Trigger onboarding sequence** (n8n automation)
5. **Add SMS notification** (n8n Twilio node)

### Security Considerations:

- ✅ Webhook is public (no sensitive data exposed)
- ✅ Password NOT sent to webhook (security best practice)
- ✅ Only registration metadata sent
- ✅ HTTPS encrypted communication
- ⚠️ Consider adding webhook signature validation for production

---

## 📚 Files Created/Modified:

### Modified:
1. `src/pages/auth/SignupPage.tsx` - Added new form fields
2. `src/stores/authStore.ts` - Added webhook integration

### Created:
3. `docs/N8N-WEBHOOK-EMAIL-TEMPLATE.html` - HTML email template
4. `docs/N8N-WEBHOOK-SETUP-GUIDE.md` - This guide

---

**Integration Status:** ✅ **READY TO TEST**

**Developer Server Running:** http://localhost:5174/

**Next Action:** Test the signup flow and verify webhook triggers!

---

**Generated by Persistent Hivemind Swarm**
**Session:** persistent-session-contractorai2
