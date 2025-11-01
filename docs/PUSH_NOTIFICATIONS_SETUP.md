# Push Notifications Setup Guide for ContractorAI

## Overview

This guide covers setting up local and push notifications for the ContractorAI iOS app, specifically for calendar events and appointment reminders.

## Installation Steps

### 1. Install Required Packages

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2

# Install Capacitor Push Notifications plugin
npm install @capacitor/push-notifications

# Install Capacitor Local Notifications plugin (for scheduled reminders)
npm install @capacitor/local-notifications

# Sync with iOS project
npx cap sync ios
```

### 2. Configure iOS Capabilities in Xcode

**Open Xcode:**
```bash
npx cap open ios
```

**Enable Push Notifications:**

1. Select the **App** target in the project navigator
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **Push Notifications**
5. Add **Background Modes**
   - Check ✅ **Remote notifications**
   - Check ✅ **Background fetch**

**Configure Info.plist:**

The following keys should be added (Xcode or manually):

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>ContractorAI needs notification permission to send you appointment reminders and calendar alerts</string>
```

### 3. Apple Developer Portal Setup

**For Production Push Notifications (APNs):**

1. Go to: https://developer.apple.com/account/resources/certificates
2. **Create APNs Key:**
   - Click **Keys** in sidebar
   - Click **+** to create new key
   - Name: "ContractorAI Push Notifications"
   - Check ✅ **Apple Push Notifications service (APNs)**
   - Click **Continue** → **Register**
   - **Download the .p8 key file** (save securely!)
   - Note your **Key ID** and **Team ID**

3. **Configure in Supabase (if using push notifications from backend):**
   - Upload .p8 key to your notification service
   - Store Key ID and Team ID securely

### 4. Notification Service Architecture

```
ContractorAI/
├── src/
│   ├── services/
│   │   ├── notifications/
│   │   │   ├── notificationService.ts      # Main notification logic
│   │   │   ├── calendarNotifications.ts    # Calendar-specific notifications
│   │   │   └── notificationTypes.ts        # Type definitions
│   └── hooks/
│       └── useNotifications.ts             # React hook for notifications
```

## Usage

### Basic Notification Setup

```typescript
import { notificationService } from '@/services/notifications/notificationService';

// Request permission when app starts
await notificationService.requestPermissions();

// Schedule a calendar reminder
await notificationService.scheduleCalendarReminder({
  id: 'event-123',
  title: 'Meeting with Client',
  body: 'Project estimate discussion at 2:00 PM',
  scheduleAt: new Date('2025-10-27T14:00:00'),
  reminderMinutes: 15 // Remind 15 minutes before
});
```

### Calendar Event Notifications

```typescript
import { calendarNotifications } from '@/services/notifications/calendarNotifications';

// Create event with multiple reminders
await calendarNotifications.createEventNotifications({
  eventId: 'event-123',
  title: 'Site Visit - John Doe',
  description: 'Initial consultation for bathroom remodel',
  startTime: new Date('2025-10-28T10:00:00'),
  reminders: [
    { minutes: 1440 }, // 1 day before
    { minutes: 60 },   // 1 hour before
    { minutes: 15 }    // 15 minutes before
  ]
});

// Cancel event notifications
await calendarNotifications.cancelEventNotifications('event-123');
```

### React Hook Usage

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function CalendarComponent() {
  const {
    hasPermission,
    requestPermission,
    scheduleReminder,
    isLoading
  } = useNotifications();

  const handleCreateEvent = async (event) => {
    if (!hasPermission) {
      await requestPermission();
    }

    await scheduleReminder({
      title: event.title,
      body: event.description,
      scheduleAt: event.startTime,
      reminderMinutes: 15
    });
  };

  return (
    // Your component JSX
  );
}
```

## Notification Types

### Local Notifications (No Server Required)

- ✅ Calendar event reminders
- ✅ Appointment alerts
- ✅ Task due date notifications
- ✅ Offline support
- ✅ Works without internet

### Push Notifications (Requires Backend)

- ✅ Real-time updates
- ✅ Client messages
- ✅ Invoice payment confirmations
- ✅ Team updates
- ✅ System alerts

## Testing Notifications

### Test on Simulator

**Note:** Push notifications don't work in simulator, but local notifications do!

```bash
# Build and run
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Run on **iOS Simulator**
2. Test local notifications (calendar reminders)
3. Check notification banner appears

### Test on Real Device

**Required for push notifications:**

1. Connect iPhone via USB
2. Select device in Xcode
3. Run app on device
4. Grant notification permissions
5. Test both local and push notifications

**Test Commands:**

```typescript
// Test immediate notification
await notificationService.scheduleImmediateNotification({
  title: 'Test Notification',
  body: 'This is a test from ContractorAI',
  id: 'test-1'
});

// Test scheduled notification (5 seconds)
const fiveSecondsLater = new Date(Date.now() + 5000);
await notificationService.scheduleCalendarReminder({
  id: 'test-2',
  title: 'Scheduled Test',
  body: 'This should appear in 5 seconds',
  scheduleAt: fiveSecondsLater,
  reminderMinutes: 0
});
```

## Common Use Cases

### 1. Appointment Reminders

```typescript
// When user creates appointment
const appointment = {
  id: '123',
  clientName: 'John Doe',
  serviceType: 'HVAC Inspection',
  scheduledTime: new Date('2025-10-28T14:00:00'),
  location: '123 Main St'
};

await calendarNotifications.createAppointmentReminders({
  appointmentId: appointment.id,
  title: `Appointment: ${appointment.clientName}`,
  body: `${appointment.serviceType} at ${appointment.location}`,
  startTime: appointment.scheduledTime,
  reminders: [
    { minutes: 1440 }, // Day before
    { minutes: 60 },   // Hour before
  ]
});
```

### 2. Task Due Date Alerts

```typescript
// Project task deadline
await notificationService.scheduleTaskDeadline({
  taskId: 'task-456',
  title: 'Task Due Today',
  body: 'Submit permit application for Johnson project',
  dueDate: new Date('2025-10-27T17:00:00')
});
```

### 3. Invoice Payment Reminders

```typescript
// Invoice due reminder
await notificationService.scheduleInvoiceReminder({
  invoiceId: 'inv-789',
  clientName: 'ABC Construction',
  amount: 5000,
  dueDate: new Date('2025-11-01T00:00:00')
});
```

## Notification Permissions Best Practices

### When to Request Permission

**✅ DO:**
- Request when user creates their first calendar event
- Request when user enables reminders in settings
- Explain WHY you need notifications before asking

**❌ DON'T:**
- Request on app launch immediately
- Request without context
- Request repeatedly if denied

### Example Permission Flow

```typescript
// Show explanation first
const showPermissionExplanation = () => {
  return (
    <div className="notification-prompt">
      <h3>Enable Appointment Reminders?</h3>
      <p>Get notified before your scheduled appointments so you never miss a meeting.</p>
      <button onClick={requestPermission}>Enable Notifications</button>
      <button onClick={dismiss}>Maybe Later</button>
    </div>
  );
};
```

## Troubleshooting

### Notifications Not Appearing

1. **Check Permissions:**
   ```typescript
   const status = await notificationService.checkPermissions();
   console.log('Permission status:', status);
   ```

2. **Verify Device Settings:**
   - iOS Settings → ContractorAI → Notifications
   - Ensure "Allow Notifications" is ON
   - Check notification style (Banner/Alert)

3. **Check Notification Schedule:**
   ```typescript
   const pending = await notificationService.getPendingNotifications();
   console.log('Pending notifications:', pending);
   ```

### Push Notifications Not Working

1. **Verify APNs Certificate:**
   - Check certificate is valid
   - Verify Bundle ID matches
   - Ensure not using development cert in production

2. **Check Device Token:**
   ```typescript
   const token = await notificationService.getDeviceToken();
   console.log('Device token:', token);
   ```

3. **Test with Development Build:**
   - Development builds require development APNs certificate
   - Production builds require production certificate

### Common Errors

**"Notification permission denied"**
- User must grant permission in iOS Settings
- Can't programmatically re-request after denial

**"Invalid notification schedule"**
- Check date is in the future
- Verify timezone handling

**"APNs token not registered"**
- Device needs internet to register with APNs
- May take a few seconds after app launch

## Production Checklist

Before App Store submission:

- [ ] Push Notification capability enabled in Xcode
- [ ] APNs key created and downloaded from Apple Developer Portal
- [ ] Info.plist contains notification usage description
- [ ] Notification permissions requested with clear explanation
- [ ] Tested on real device (not simulator)
- [ ] Local notifications working for calendar events
- [ ] Background notification handling implemented
- [ ] Notification badges configured (if using)
- [ ] Deep linking from notifications works
- [ ] Notification settings page in app (allow users to customize)

## Additional Features

### Notification Categories (Actions)

```typescript
// Add action buttons to notifications
await notificationService.scheduleWithActions({
  id: 'event-123',
  title: 'Appointment in 15 minutes',
  body: 'Meeting with John Doe',
  actions: [
    { id: 'view', title: 'View Details' },
    { id: 'directions', title: 'Get Directions' },
    { id: 'snooze', title: 'Remind in 5 min' }
  ]
});
```

### Rich Notifications (Images)

```typescript
// Add images to notifications
await notificationService.scheduleWithImage({
  id: 'project-update',
  title: 'Project Photo Uploaded',
  body: 'New photos from Johnson project',
  imageUrl: 'https://your-cdn.com/photo.jpg'
});
```

### Notification Badges

```typescript
// Set app badge count
await notificationService.setBadgeCount(3);

// Clear badge
await notificationService.clearBadge();
```

## Resources

- **Capacitor Push Notifications:** https://capacitorjs.com/docs/apis/push-notifications
- **Capacitor Local Notifications:** https://capacitorjs.com/docs/apis/local-notifications
- **Apple Push Notification Service:** https://developer.apple.com/documentation/usernotifications
- **APNs Best Practices:** https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server

---

**Next Steps:**
1. Install packages
2. Configure Xcode capabilities
3. Implement notification service
4. Test on device
5. Submit to App Store with notification permissions

Good luck! 📲
