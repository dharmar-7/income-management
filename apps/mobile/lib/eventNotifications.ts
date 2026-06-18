import * as Notifications from 'expo-notifications';

// Ensure notifications show while the app is foregrounded too (idempotent with notes' handler).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface SchedulableEvent {
  id: string;
  title: string;
  personName: string | null;
  nextOccurrence: string; // ISO
  notifyDaysBefore: number;
  icon: string;
  isSelf: boolean;
}

// Schedule a one-shot local notification for an event's next occurrence (minus
// notifyDaysBefore) at 9am. The Calendar screen reschedules on load, so after one
// fires the following year's gets set up on the next visit.
export async function scheduleEventNotification(ev: SchedulableEvent) {
  const id = `event-${ev.id}`;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  const fire = new Date(ev.nextOccurrence);
  fire.setDate(fire.getDate() - (ev.notifyDaysBefore || 0));
  fire.setHours(9, 0, 0, 0);
  // If that moment is already in the past (e.g. the event is today after 9am),
  // nudge it to a minute from now so it still alerts.
  if (fire.getTime() <= Date.now()) fire.setTime(Date.now() + 60_000);

  const body =
    ev.notifyDaysBefore > 0
      ? `${ev.title} is in ${ev.notifyDaysBefore} day${ev.notifyDaysBefore > 1 ? 's' : ''}`
      : ev.isSelf
        ? `It's ${ev.title} today 🎉`
        : `Today is ${ev.title}${ev.personName ? ` (${ev.personName})` : ''}`;

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title: `${ev.icon} ${ev.title}`, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
  });
}

export async function cancelEventNotification(eventId: string) {
  await Notifications.cancelScheduledNotificationAsync(`event-${eventId}`).catch(() => {});
}

// Re-sync all scheduled event notifications (call when the events list loads/changes).
export async function rescheduleAllEvents(events: SchedulableEvent[]) {
  for (const ev of events) await scheduleEventNotification(ev);
}
