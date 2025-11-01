# Quick Start: Push Notifications

## 1-Minute Setup

### Install Packages

```bash
cd /Users/mikahalbertson/git/ContractorAI/contractorai2
npm install @capacitor/push-notifications @capacitor/local-notifications
npx cap sync ios
npx cap open ios
```

### Configure Xcode (2 minutes)

1. **Select App target** → **Signing & Capabilities**
2. Click **+ Capability**:
   - ✅ Push Notifications
   - ✅ Background Modes → Check "Remote notifications"

### Test It (30 seconds)

```typescript
import { notificationService } from './services/notifications/notificationService';

// Request permission
await notificationService.requestPermissions();

// Test notification (appears in 5 seconds)
await notificationService.scheduleImmediateNotification({
  id: 'test-1',
  title: 'Test Notification',
  body: 'Push notifications are working!'
});
```

## Usage in Calendar

```typescript
import { calendarNotifications } from './services/notifications/calendarNotifications';

// Schedule appointment reminder
await calendarNotifications.createAppointmentReminders({
  appointmentId: '123',
  title: 'Meeting with Client',
  startTime: new Date('2025-10-28T14:00:00'),
  reminders: [
    { minutes: 60 },  // 1 hour before
    { minutes: 15 },  // 15 minutes before
  ]
});
```

## React Hook

```typescript
import { useNotifications } from './hooks/useNotifications';

function MyComponent() {
  const { hasPermission, requestPermission, scheduleReminder } = useNotifications();

  const handleSchedule = async () => {
    if (!hasPermission) {
      await requestPermission();
    }

    await scheduleReminder({
      id: 'reminder-1',
      title: 'Appointment Reminder',
      body: 'Meeting in 15 minutes',
      scheduleAt: new Date(Date.now() + 15 * 60 * 1000),
      reminderMinutes: 0
    });
  };

  return <button onClick={handleSchedule}>Set Reminder</button>;
}
```

## Files Created

- `/src/services/notifications/notificationService.ts` - Core service
- `/src/services/notifications/calendarNotifications.ts` - Calendar-specific
- `/src/services/notifications/notificationTypes.ts` - TypeScript types
- `/src/hooks/useNotifications.ts` - React hook
- `/docs/PUSH_NOTIFICATIONS_SETUP.md` - Full documentation

## Next Steps

1. **Test on simulator**: Local notifications work
2. **Test on device**: Push notifications require real device
3. **Add to Calendar page**: Integrate with event creation
4. **Create APNs key**: For production push notifications

## Troubleshooting

**Notifications not appearing?**
```typescript
// Check permissions
const status = await notificationService.checkPermissions();
console.log('Permission:', status.display); // Should be 'granted'

// Check pending
const pending = await notificationService.getPendingNotifications();
console.log('Pending notifications:', pending.length);
```

**Permission denied?**
- User must grant permission in iOS Settings → ContractorAI → Notifications
- Can't be programmatically reset

That's it! You're ready to use notifications. 🎉
