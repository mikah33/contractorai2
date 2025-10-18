// ============================================
// N8N CODE NODE: Split Recipients
// ============================================
// This code automatically detects and processes
// all email recipients from the webhook payload
// ============================================

// Extract all recipients from the webhook payload
const recipients = $input.item.json.body.notification.recipients;
const eventData = $input.item.json.body.event;
const notificationData = $input.item.json.body.notification;
const timestamp = $input.item.json.body.timestamp;

// Log for debugging
console.log(`Processing ${recipients.length} recipients`);

// Create an array of items, one for each recipient
// This allows n8n to send individual emails to each person
const items = recipients.map((recipient, index) => ({
  json: {
    recipient: {
      email: recipient.email,
      name: recipient.name || `Recipient ${index + 1}`
    },
    event: {
      id: eventData.id,
      title: eventData.title,
      description: eventData.description || '',
      start_date: eventData.start_date,
      end_date: eventData.end_date,
      location: eventData.location || '',
      event_type: eventData.event_type,
      status: eventData.status,
      project_id: eventData.project_id,
      client_id: eventData.client_id
    },
    notification: {
      trigger_time: notificationData.trigger_time,
      message: notificationData.message || '',
      is_test: notificationData.is_test || false
    },
    timestamp: timestamp
  }
}));

console.log(`Created ${items.length} email items`);

return items;
