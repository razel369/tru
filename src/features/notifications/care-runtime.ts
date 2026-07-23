import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { Pet } from "../../types";
import type { CareTask, HealthRecord } from "../care/types";
import type { NotificationPermissionState } from "./types";

const REMINDERS_KEY = "pawpair.care.reminders.v1";
const REMINDER_PRIVACY_KEY = "pawpair.care.reminder-privacy.v1";
const REMINDER_REQUESTED_KEY = "pawpair.care.reminder-requested.v1";
const OWNER = "pawpair-care";
const CATEGORY = "pawpair.care";
const PASSIVE_CATEGORY = "pawpair.reminder";
const MARK_DONE_ACTION = "pawpair.mark-done";
const SNOOZE_ACTION = "pawpair.snooze-15";
const SKIP_ACTION = "pawpair.skip";
const MAX_IOS_REMINDERS = 60;
const MIN_FUTURE_TRIGGER_MS = 5_000;

function trackReminderAnalyticsEvent(
  eventName:
    | "notification_prompted"
    | "notification_granted"
    | "notification_denied",
) {
  void import("../analytics/service")
    .then(({ trackAnalyticsEvent }) => trackAnalyticsEvent(eventName))
    .catch(() => undefined);
}

export type CareReminderState = {
  enabled: boolean;
  limited: boolean;
  permission: NotificationPermissionState;
  requested: number;
  scheduled: number;
};

export type CareReminderPrivacy = "detailed" | "private";

export type CareNotificationTarget = {
  date?: string;
  kind: "care" | "health";
  petId: string;
  sourceId: string;
};

export type CareNotificationActionTarget = {
  action: "done" | "skipped";
  date: string;
  petId: string;
  scheduledTime: string;
  taskId: string;
};

type ReminderRequest = {
  content: Notifications.NotificationContentInput;
  identifier: string;
  trigger: Notifications.NotificationTriggerInput;
};

let initialized = false;
let initializationPromise: Promise<void> | null = null;
let reminderOperationQueue: Promise<void> = Promise.resolve();
let notificationTargetListener:
  | ((target: CareNotificationTarget) => void)
  | null = null;
let pendingNotificationTarget: CareNotificationTarget | null = null;
let notificationActionListener:
  | ((target: CareNotificationActionTarget) => void)
  | null = null;
let pendingNotificationActions: CareNotificationActionTarget[] = [];
let lastHandledResponseId: string | null = null;

function deliverNotificationTarget(target: CareNotificationTarget) {
  if (notificationTargetListener) {
    notificationTargetListener(target);
  } else {
    pendingNotificationTarget = target;
  }
}

export function subscribeCareNotificationTargets(
  listener: (target: CareNotificationTarget) => void,
) {
  notificationTargetListener = listener;
  if (pendingNotificationTarget) {
    const pending = pendingNotificationTarget;
    pendingNotificationTarget = null;
    listener(pending);
  }
  return () => {
    if (notificationTargetListener === listener) {
      notificationTargetListener = null;
    }
  };
}

function deliverNotificationAction(target: CareNotificationActionTarget) {
  if (notificationActionListener) {
    notificationActionListener(target);
  } else {
    pendingNotificationActions.push(target);
  }
}

export function subscribeCareNotificationActions(
  listener: (target: CareNotificationActionTarget) => void,
) {
  notificationActionListener = listener;
  if (pendingNotificationActions.length) {
    const pending = pendingNotificationActions;
    pendingNotificationActions = [];
    pending.forEach(listener);
  }
  return () => {
    if (notificationActionListener === listener) {
      notificationActionListener = null;
    }
  };
}

function enqueueReminderOperation<T>(operation: () => Promise<T>) {
  const result = reminderOperationQueue.then(operation);
  reminderOperationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function permissionState(
  settings: Notifications.NotificationPermissionsStatus,
): NotificationPermissionState {
  if (settings.granted) return "granted";
  return settings.canAskAgain ? "undetermined" : "denied";
}

async function reminderPreference() {
  return (await AsyncStorage.getItem(REMINDERS_KEY)) === "true";
}

async function requestedReminderCount() {
  const parsed = Number(await AsyncStorage.getItem(REMINDER_REQUESTED_KEY));
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

async function storeRequestedReminderCount(count: number) {
  await AsyncStorage.setItem(REMINDER_REQUESTED_KEY, String(count));
}

export async function getCareReminderPrivacy(): Promise<CareReminderPrivacy> {
  return (await AsyncStorage.getItem(REMINDER_PRIVACY_KEY)) === "detailed"
    ? "detailed"
    : "private";
}

function timeParts(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function contentFor(
  task: CareTask,
  pet: Pet,
  privacy: CareReminderPrivacy,
) {
  const appointment = task.category === "appointment";
  const data = {
    owner: OWNER,
    taskId: task.id,
    petId: pet.id,
    ...(task.schedule.date ? { scheduleDate: task.schedule.date } : {}),
  };
  if (privacy === "private") {
    return {
      title: "PawPair reminder",
      body: appointment
        ? `An appointment for ${pet.name} is coming up.`
        : `A care moment for ${pet.name} is ready.`,
      data,
      categoryIdentifier: appointment ? PASSIVE_CATEGORY : CATEGORY,
      interruptionLevel: "active" as const,
      sound: "default" as const,
    } satisfies Notifications.NotificationContentInput;
  }
  return {
    title: appointment
      ? `${pet.name}'s appointment`
      : `${pet.name}'s care moment`,
    body: appointment
      ? [task.title, task.details?.provider, task.details?.location]
          .filter(Boolean)
          .join(" / ")
      : `Time for ${task.title}.`,
    data,
    categoryIdentifier: appointment ? PASSIVE_CATEGORY : CATEGORY,
    interruptionLevel: "active" as const,
    sound: "default" as const,
  } satisfies Notifications.NotificationContentInput;
}

function healthContentFor(
  record: HealthRecord,
  pet: Pet,
  privacy: CareReminderPrivacy,
  dueToday: boolean,
) {
  const data = {
    owner: OWNER,
    healthRecordId: record.id,
    petId: pet.id,
    kind: "health-due",
  };
  if (privacy === "private") {
    return {
      title: "PawPair reminder",
      body: dueToday
        ? `A health follow-up for ${pet.name} is due today.`
        : `A health follow-up for ${pet.name} is coming up.`,
      data,
      categoryIdentifier: PASSIVE_CATEGORY,
      interruptionLevel: "active" as const,
      sound: "default" as const,
    } satisfies Notifications.NotificationContentInput;
  }
  return {
    title: `${pet.name}'s health follow-up`,
    body: dueToday
      ? `${record.title} is due today.`
      : `${record.title} is due in 7 days.`,
    data,
    categoryIdentifier: PASSIVE_CATEGORY,
    interruptionLevel: "active" as const,
    sound: "default" as const,
  } satisfies Notifications.NotificationContentInput;
}

function localHealthDueDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 9, 0, 0, 0);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function requestsForHealthRecord(
  record: HealthRecord,
  pet: Pet,
  privacy: CareReminderPrivacy,
  nowMs = Date.now(),
): ReminderRequest[] {
  if (!record.nextDueDate) return [];
  const dueDate = localHealthDueDate(record.nextDueDate);
  if (!dueDate || dueDate.getTime() <= nowMs + MIN_FUTURE_TRIGGER_MS) return [];

  const requests: ReminderRequest[] = [];
  const leadDate = new Date(dueDate);
  leadDate.setDate(leadDate.getDate() - 7);
  if (leadDate.getTime() > nowMs + MIN_FUTURE_TRIGGER_MS) {
    requests.push({
      identifier: `${OWNER}-health-${record.id}-lead-7`,
      content: healthContentFor(record, pet, privacy, false),
      trigger: {
        type: "date",
        date: leadDate,
      } as unknown as Notifications.NotificationTriggerInput,
    });
  }
  requests.push({
    identifier: `${OWNER}-health-${record.id}-due`,
    content: healthContentFor(record, pet, privacy, true),
    trigger: {
      type: "date",
      date: dueDate,
    } as unknown as Notifications.NotificationTriggerInput,
  });
  return requests;
}

function urgentHealthRecord(record: HealthRecord, nowMs = Date.now()) {
  if (!record.nextDueDate) return false;
  const dueDate = localHealthDueDate(record.nextDueDate);
  return Boolean(
    dueDate && dueDate.getTime() - nowMs <= 30 * 24 * 60 * 60 * 1000,
  );
}

function shiftedReminderTime(
  hour: number,
  minute: number,
  leadMinutes: number,
) {
  const shifted = hour * 60 + minute - leadMinutes;
  const dayOffset = Math.floor(shifted / (24 * 60));
  const normalized = ((shifted % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    dayOffset,
    hour: Math.floor(normalized / 60),
    minute: normalized % 60,
  };
}

function oneTimeReminderDate(
  appointmentDate: Date,
  preferredReminderDate: Date,
  nowMs = Date.now(),
) {
  const minimumFutureTime = nowMs + MIN_FUTURE_TRIGGER_MS;
  if (appointmentDate.getTime() <= minimumFutureTime) return null;
  return preferredReminderDate.getTime() > minimumFutureTime
    ? preferredReminderDate
    : appointmentDate;
}

function taskReminderPriority(task: CareTask) {
  if (
    task.category === "appointment" &&
    task.schedule.frequency === "once"
  ) {
    return 0;
  }
  if (task.category === "medication") return 1;
  if (task.category === "appointment") return 2;
  if (task.category === "feeding" || task.category === "water") return 3;
  return 4;
}

function taskReminderSortKey(task: CareTask) {
  return [
    task.schedule.date ?? "9999-12-31",
    task.schedule.times[0] ?? "23:59",
    task.createdAt,
    task.id,
  ].join("|");
}

function requestsForTask(
  task: CareTask,
  pet: Pet,
  privacy: CareReminderPrivacy,
): ReminderRequest[] {
  if (!task.enabled) return [];
  const content = contentFor(task, pet, privacy);
  const requests: ReminderRequest[] = [];
  const leadMinutes =
    task.category === "appointment"
      ? task.details?.reminderLeadMinutes ?? 0
      : 0;

  for (const [timeIndex, value] of task.schedule.times.entries()) {
    const time = timeParts(value);
    if (!time) continue;
    const occurrenceContent = {
      ...content,
      data: {
        ...content.data,
        scheduledTime: value.trim(),
      },
    } satisfies Notifications.NotificationContentInput;
    const reminder = shiftedReminderTime(
      time.hour,
      time.minute,
      leadMinutes,
    );

    if (task.schedule.frequency === "daily") {
      requests.push({
        identifier: `${OWNER}-${task.id}-daily-${timeIndex}`,
        content: occurrenceContent,
        trigger: {
          type: "daily",
          hour: reminder.hour,
          minute: reminder.minute,
        } as unknown as Notifications.NotificationTriggerInput,
      });
      continue;
    }

    if (task.schedule.frequency === "weekly") {
      for (const weekday of task.schedule.weekdays ?? []) {
        const reminderWeekday =
          ((weekday + reminder.dayOffset) % 7 + 7) % 7;
        requests.push({
          identifier: `${OWNER}-${task.id}-weekly-${weekday}-${timeIndex}`,
          content: occurrenceContent,
          trigger: {
            type: "weekly",
            weekday: reminderWeekday + 1,
            hour: reminder.hour,
            minute: reminder.minute,
          } as unknown as Notifications.NotificationTriggerInput,
        });
      }
      continue;
    }

    if (task.schedule.date) {
      const date = new Date(
        `${task.schedule.date}T${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}:00`,
      );
      const reminderDate = new Date(date.getTime() - leadMinutes * 60 * 1000);
      const triggerDate = oneTimeReminderDate(date, reminderDate);
      if (triggerDate) {
        requests.push({
          identifier: `${OWNER}-${task.id}-once-${timeIndex}`,
          content: occurrenceContent,
          trigger: {
            type: "date",
            date: triggerDate,
          } as unknown as Notifications.NotificationTriggerInput,
        });
      }
    }
  }
  return requests;
}

async function cancelOwnedReminders() {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const owned = scheduled.filter(
    (notification) => notification.content.data?.owner === OWNER,
  );
  await Promise.all(
    owned.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}

export async function initializeCareNotifications() {
  if (initialized || Platform.OS === "web") return;
  if (!initializationPromise) {
    initializationPromise = (async () => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      if (Platform.OS === "ios") {
        await Promise.all([
          Notifications.setNotificationCategoryAsync(CATEGORY, [
            {
              identifier: MARK_DONE_ACTION,
              buttonTitle: "Done",
              options: { opensAppToForeground: false },
            },
            {
              identifier: SNOOZE_ACTION,
              buttonTitle: "Snooze 15 min",
              options: { opensAppToForeground: false },
            },
            {
              identifier: SKIP_ACTION,
              buttonTitle: "Skip",
              options: {
                isDestructive: true,
                opensAppToForeground: false,
              },
            },
          ]),
          Notifications.setNotificationCategoryAsync(PASSIVE_CATEGORY, [
            {
              identifier: SNOOZE_ACTION,
              buttonTitle: "Snooze 15 min",
              options: { opensAppToForeground: false },
            },
          ]),
        ]);
      }

      const handleResponse = (
        response: Notifications.NotificationResponse,
      ) => {
        const request = response.notification.request;
        const responseId = `${request.identifier}:${response.notification.date}`;
        if (
          request.content.data?.owner !== OWNER ||
          responseId === lastHandledResponseId
        ) {
          return;
        }

        if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          const petId = request.content.data?.petId;
          const healthRecordId = request.content.data?.healthRecordId;
          const taskId = request.content.data?.taskId;
          const scheduleDate = request.content.data?.scheduleDate;
          if (typeof petId === "string" && typeof healthRecordId === "string") {
            lastHandledResponseId = responseId;
            deliverNotificationTarget({
              kind: "health",
              petId,
              sourceId: healthRecordId,
            });
          } else if (typeof petId === "string" && typeof taskId === "string") {
            lastHandledResponseId = responseId;
            deliverNotificationTarget({
              kind: "care",
              petId,
              sourceId: taskId,
              ...(typeof scheduleDate === "string" ? { date: scheduleDate } : {}),
            });
          }
          return;
        }

        if (
          response.actionIdentifier === MARK_DONE_ACTION ||
          response.actionIdentifier === SKIP_ACTION
        ) {
          const petId = request.content.data?.petId;
          const taskId = request.content.data?.taskId;
          const scheduledTime = request.content.data?.scheduledTime;
          const scheduleDate = request.content.data?.scheduleDate;
          const occurrenceDate = request.content.data?.occurrenceDate;
          const deliveredAt = new Date(response.notification.date);
          const date =
            typeof occurrenceDate === "string" && localHealthDueDate(occurrenceDate)
              ? occurrenceDate
              : typeof scheduleDate === "string" && localHealthDueDate(scheduleDate)
              ? scheduleDate
              : `${deliveredAt.getFullYear()}-${String(deliveredAt.getMonth() + 1).padStart(2, "0")}-${String(deliveredAt.getDate()).padStart(2, "0")}`;
          if (
            typeof petId === "string" &&
            typeof taskId === "string" &&
            typeof scheduledTime === "string" &&
            timeParts(scheduledTime) &&
            !Number.isNaN(deliveredAt.getTime())
          ) {
            lastHandledResponseId = responseId;
            deliverNotificationAction({
              action:
                response.actionIdentifier === MARK_DONE_ACTION
                  ? "done"
                  : "skipped",
              date,
              petId,
              scheduledTime,
              taskId,
            });
          }
          return;
        }

        if (response.actionIdentifier !== SNOOZE_ACTION) return;
        lastHandledResponseId = responseId;
        const deliveredAt = new Date(response.notification.date);
        const scheduleDate = request.content.data?.scheduleDate;
        const occurrenceDate =
          typeof scheduleDate === "string" && localHealthDueDate(scheduleDate)
            ? scheduleDate
            : `${deliveredAt.getFullYear()}-${String(deliveredAt.getMonth() + 1).padStart(2, "0")}-${String(deliveredAt.getDate()).padStart(2, "0")}`;
        void Notifications.scheduleNotificationAsync({
          identifier: `${request.identifier}-snooze-${Date.now()}`,
          content: {
            title: request.content.title ?? "PawPair care moment",
            body: request.content.body ?? "A care moment is ready.",
            data: {
              ...request.content.data,
              occurrenceDate,
            },
            categoryIdentifier:
              request.content.categoryIdentifier ?? PASSIVE_CATEGORY,
            interruptionLevel: "active",
            sound: "default",
          },
          trigger: {
            type: "date",
            date: new Date(Date.now() + 15 * 60 * 1000),
          } as unknown as Notifications.NotificationTriggerInput,
        }).catch(() => undefined);
      };

      Notifications.addNotificationResponseReceivedListener(handleResponse);
      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        handleResponse(lastResponse);
        await Notifications.clearLastNotificationResponseAsync();
      }
      initialized = true;
    })();
  }

  try {
    await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}

export async function getCareReminderState(): Promise<CareReminderState> {
  if (Platform.OS === "web") {
    return {
      enabled: false,
      limited: false,
      permission: "unsupported",
      requested: 0,
      scheduled: 0,
    };
  }
  const [preferred, permissions, requested, scheduled] = await Promise.all([
    reminderPreference(),
    Notifications.getPermissionsAsync(),
    requestedReminderCount(),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);
  const permission = permissionState(permissions);
  const scheduledCount = scheduled.filter(
    (notification) => notification.content.data?.owner === OWNER,
  ).length;
  return {
    enabled: preferred && permission === "granted",
    limited: Platform.OS === "ios" && requested > MAX_IOS_REMINDERS,
    permission,
    requested,
    scheduled: scheduledCount,
  };
}

async function syncCareRemindersNow(
  tasks: CareTask[],
  pets: Pet[],
  healthRecords: HealthRecord[],
) {
  if (Platform.OS === "web") return 0;
  await initializeCareNotifications();
  if (!(await reminderPreference())) {
    await storeRequestedReminderCount(0);
    await cancelOwnedReminders();
    return 0;
  }
  const permissions = await Notifications.getPermissionsAsync();
  if (permissionState(permissions) !== "granted") {
    await storeRequestedReminderCount(0);
    await cancelOwnedReminders();
    return 0;
  }

  const privacy = await getCareReminderPrivacy();
  const petsById = new Map(pets.map((pet) => [pet.id, pet]));
  const orderedTasks = [...tasks].sort(
    (first, second) =>
      taskReminderPriority(first) - taskReminderPriority(second) ||
      taskReminderSortKey(first).localeCompare(taskReminderSortKey(second)),
  );
  const taskRequests = orderedTasks
    .flatMap((task) => {
      const pet = petsById.get(task.petId);
      return pet ? requestsForTask(task, pet, privacy) : [];
    });
  const orderedHealthRecords = [...healthRecords].sort(
    (first, second) =>
      (first.nextDueDate ?? "9999-12-31").localeCompare(
        second.nextDueDate ?? "9999-12-31",
      ) || first.createdAt.localeCompare(second.createdAt) || first.id.localeCompare(second.id),
  );
  const urgentHealthRequests: ReminderRequest[] = [];
  const laterHealthRequests: ReminderRequest[] = [];
  for (const record of orderedHealthRecords) {
    const pet = petsById.get(record.petId);
    if (!pet) continue;
    const target = urgentHealthRecord(record)
      ? urgentHealthRequests
      : laterHealthRequests;
    target.push(...requestsForHealthRecord(record, pet, privacy));
  }
  const requested = [
    ...urgentHealthRequests,
    ...taskRequests,
    ...laterHealthRequests,
  ];
  const allRequests = Array.from(
    new Map(requested.map((request) => [request.identifier, request])).values(),
  );
  const requests =
    Platform.OS === "ios"
      ? allRequests.slice(0, MAX_IOS_REMINDERS)
      : allRequests;
  await storeRequestedReminderCount(allRequests.length);
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const desiredIdentifiers = new Set(
    requests.map((request) => request.identifier),
  );

  for (const request of requests) {
    await Notifications.scheduleNotificationAsync(request);
  }
  const stale = existing.filter(
    (notification) =>
      notification.content.data?.owner === OWNER &&
      !desiredIdentifiers.has(notification.identifier),
  );
  await Promise.all(
    stale.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
  return requests.length;
}

export function syncCareReminders(
  tasks: CareTask[],
  pets: Pet[],
  healthRecords: HealthRecord[] = [],
) {
  return enqueueReminderOperation(async () => {
    await syncCareRemindersNow(tasks, pets, healthRecords);
    return getCareReminderState();
  });
}

async function setCareRemindersEnabledNow(
  enabled: boolean,
  tasks: CareTask[],
  pets: Pet[],
  healthRecords: HealthRecord[],
): Promise<CareReminderState> {
  if (Platform.OS === "web") {
    return {
      enabled: false,
      limited: false,
      permission: "unsupported",
      requested: 0,
      scheduled: 0,
    };
  }
  if (!enabled) {
    await Promise.all([
      AsyncStorage.setItem(REMINDERS_KEY, "false"),
      storeRequestedReminderCount(0),
    ]);
    await cancelOwnedReminders();
    return getCareReminderState();
  }

  const current = await Notifications.getPermissionsAsync();
  const shouldPrompt = !current.granted;
  if (shouldPrompt) {
    trackReminderAnalyticsEvent("notification_prompted");
  }
  const permissions = current.granted
    ? current
    : await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
  if (shouldPrompt) {
    trackReminderAnalyticsEvent(
      permissions.granted ? "notification_granted" : "notification_denied",
    );
  }
  if (!permissions.granted) {
    await Promise.all([
      AsyncStorage.setItem(REMINDERS_KEY, "false"),
      storeRequestedReminderCount(0),
    ]);
    await cancelOwnedReminders();
    return getCareReminderState();
  }

  await AsyncStorage.setItem(REMINDERS_KEY, "true");
  await syncCareRemindersNow(tasks, pets, healthRecords);
  return getCareReminderState();
}

export function setCareRemindersEnabled(
  enabled: boolean,
  tasks: CareTask[],
  pets: Pet[],
  healthRecords: HealthRecord[] = [],
): Promise<CareReminderState> {
  return enqueueReminderOperation(() =>
    setCareRemindersEnabledNow(enabled, tasks, pets, healthRecords),
  );
}

export function setCareReminderPrivacy(
  privacy: CareReminderPrivacy,
  tasks: CareTask[],
  pets: Pet[],
  healthRecords: HealthRecord[] = [],
): Promise<CareReminderPrivacy> {
  return enqueueReminderOperation(async () => {
    await AsyncStorage.setItem(REMINDER_PRIVACY_KEY, privacy);
    await syncCareRemindersNow(tasks, pets, healthRecords);
    return privacy;
  });
}
