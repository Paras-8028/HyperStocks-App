import { UserPreferences } from '@/types/personalization';
import { IUserPreferenceDocument } from '@/database/models/user_preference.model';

export type UserScheduleConfig = Pick<
    UserPreferences,
    | 'userId'
    | 'email'
    | 'newsEmailEnabled'
    | 'timezone'
    | 'deliveryMode'
    | 'preferredDeliveryTime'
    | 'scheduleIntervalMinutes'
    | 'deliveryDays'
    | 'isSchedulePaused'
    | 'lastNewsDeliveryAt'
    | 'nextNewsDeliveryAt'
>;

/**
 * Validates whether a given string is a valid IANA timezone identifier.
 */
export function isValidIanaTimezone(tz?: string): boolean {
    if (!tz || typeof tz !== 'string') return false;
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates whether a time string matches HH:mm (24-hour format).
 */
export function isValidTimeFormat(timeStr?: string): boolean {
    if (!timeStr || typeof timeStr !== 'string') return false;
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim());
}

/**
 * Validates whether interval in minutes is supported (between 30 and 1440 mins).
 */
export function isValidInterval(intervalMinutes?: number): boolean {
    if (typeof intervalMinutes !== 'number' || isNaN(intervalMinutes)) return false;
    return intervalMinutes >= 30 && intervalMinutes <= 1440;
}

/**
 * Computes the user's local time components in their configured IANA timezone.
 */
export function getUserLocalTimeComponents(
    date: Date = new Date(),
    timeZone: string = 'Asia/Kolkata'
): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    dayOfWeek: number;
    dateString: string; // YYYY-MM-DD
    timeString: string; // HH:mm
} {
    const validTz = isValidIanaTimezone(timeZone) ? timeZone : 'Asia/Kolkata';

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: validTz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const partMap: Record<string, string> = {};
    for (const part of parts) {
        partMap[part.type] = part.value;
    }

    const year = parseInt(partMap['year'] || '1970', 10);
    const month = parseInt(partMap['month'] || '01', 10);
    const day = parseInt(partMap['day'] || '01', 10);
    const hour = parseInt(partMap['hour'] || '00', 10);
    const minute = parseInt(partMap['minute'] || '00', 10);

    // Compute day of week in the target timezone
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: validTz,
        weekday: 'short',
    });
    const weekdayStr = weekdayFormatter.format(date);
    const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
    };
    const dayOfWeek = weekdayMap[weekdayStr] ?? 0;

    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    return {
        year,
        month,
        day,
        hour,
        minute,
        dayOfWeek,
        dateString,
        timeString,
    };
}

export interface DeliveryEligibilityResult {
    isDue: boolean;
    reason: string;
    idempotencyKey?: string;
    localDateString?: string;
}

/**
 * Evaluates whether a user is currently eligible and due for a scheduled news email.
 * Handles timezone conversion, daylight-saving time, weekdays, intervals, and idempotency.
 */
export function isDeliveryDue(
    user: Partial<UserScheduleConfig | IUserPreferenceDocument>,
    referenceDate: Date = new Date()
): DeliveryEligibilityResult {
    if (!user.userId) {
        return { isDue: false, reason: 'missing_user_id' };
    }

    // 1. Check if news emails are enabled
    if (user.newsEmailEnabled === false) {
        return { isDue: false, reason: 'news_emails_disabled' };
    }

    // 2. Check if schedule is paused
    if (user.isSchedulePaused === true) {
        return { isDue: false, reason: 'schedule_paused' };
    }

    // 3. Check for valid email address
    if (!user.email || !user.email.includes('@')) {
        return { isDue: false, reason: 'invalid_or_missing_email' };
    }

    const timezone = isValidIanaTimezone(user.timezone) ? user.timezone! : 'Asia/Kolkata';
    const deliveryMode = user.deliveryMode === 'interval' ? 'interval' : 'daily';

    // 4. Mode-specific evaluation
    if (deliveryMode === 'daily') {
        const local = getUserLocalTimeComponents(referenceDate, timezone);

        // Check enabled delivery days (0 = Sun, 1 = Mon, ..., 6 = Sat)
        const deliveryDays = Array.isArray(user.deliveryDays) && user.deliveryDays.length > 0
            ? user.deliveryDays
            : [1, 2, 3, 4, 5]; // Default weekdays

        if (!deliveryDays.includes(local.dayOfWeek)) {
            return {
                isDue: false,
                reason: `day_not_enabled (today is ${local.dayOfWeek}, enabled: ${deliveryDays.join(',')})`,
            };
        }

        // Parse target delivery time (default 08:00)
        const targetTime = isValidTimeFormat(user.preferredDeliveryTime)
            ? user.preferredDeliveryTime!
            : '08:00';
        const [targetHourStr] = targetTime.split(':');
        const targetHour = parseInt(targetHourStr, 10);

        // Daily hourly dispatcher: check if the local hour matches target hour
        if (local.hour !== targetHour) {
            return {
                isDue: false,
                reason: `hour_mismatch (current local hour: ${local.hour}, target hour: ${targetHour})`,
            };
        }

        // Idempotency key for daily delivery: unique to user and local date
        const idempotencyKey = `${user.userId}:daily:${local.dateString}`;

        // Check if user has already received a digest today in their local timezone
        if (user.lastNewsDeliveryAt) {
            const lastSentDate = new Date(user.lastNewsDeliveryAt);
            const lastLocal = getUserLocalTimeComponents(lastSentDate, timezone);
            if (lastLocal.dateString === local.dateString) {
                return {
                    isDue: false,
                    reason: `already_delivered_today (last sent on ${lastLocal.dateString})`,
                    idempotencyKey,
                    localDateString: local.dateString,
                };
            }
        }

        return {
            isDue: true,
            reason: 'daily_delivery_due',
            idempotencyKey,
            localDateString: local.dateString,
        };
    } else {
        // Interval mode
        const intervalMinutes = isValidInterval(user.scheduleIntervalMinutes)
            ? user.scheduleIntervalMinutes!
            : 240;

        // Interval slot identifier
        const slot = Math.floor(referenceDate.getTime() / (intervalMinutes * 60 * 1000));
        const idempotencyKey = `${user.userId}:interval:${slot}`;

        if (!user.lastNewsDeliveryAt) {
            return {
                isDue: true,
                reason: 'interval_initial_delivery_due',
                idempotencyKey,
            };
        }

        const lastSentDate = new Date(user.lastNewsDeliveryAt);
        const elapsedMinutes = (referenceDate.getTime() - lastSentDate.getTime()) / (60 * 1000);

        if (elapsedMinutes < intervalMinutes) {
            return {
                isDue: false,
                reason: `interval_not_elapsed (${Math.round(elapsedMinutes)}m / ${intervalMinutes}m)`,
                idempotencyKey,
            };
        }

        return {
            isDue: true,
            reason: 'interval_delivery_due',
            idempotencyKey,
        };
    }
}

/**
 * Calculates the next approximate delivery timestamp.
 */
export function calculateNextDelivery(
    user: Partial<UserScheduleConfig | IUserPreferenceDocument>,
    referenceDate: Date = new Date()
): Date {
    const timezone = isValidIanaTimezone(user.timezone) ? user.timezone! : 'Asia/Kolkata';
    const deliveryMode = user.deliveryMode === 'interval' ? 'interval' : 'daily';

    if (deliveryMode === 'interval') {
        const intervalMinutes = isValidInterval(user.scheduleIntervalMinutes)
            ? user.scheduleIntervalMinutes!
            : 240;
        const base = user.lastNewsDeliveryAt ? new Date(user.lastNewsDeliveryAt) : referenceDate;
        return new Date(base.getTime() + intervalMinutes * 60 * 1000);
    }

    // Daily mode: find next matching day and time
    const targetTime = isValidTimeFormat(user.preferredDeliveryTime)
        ? user.preferredDeliveryTime!
        : '08:00';
    const [targetHour, targetMin] = targetTime.split(':').map((s) => parseInt(s, 10));
    const deliveryDays = Array.isArray(user.deliveryDays) && user.deliveryDays.length > 0
        ? user.deliveryDays
        : [1, 2, 3, 4, 5];

    // Search up to 8 days ahead
    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
        const candidate = new Date(referenceDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const local = getUserLocalTimeComponents(candidate, timezone);

        if (!deliveryDays.includes(local.dayOfWeek)) {
            continue;
        }

        // If today, only consider if target time is in future
        if (dayOffset === 0) {
            if (local.hour > targetHour || (local.hour === targetHour && local.minute >= targetMin)) {
                continue;
            }
        }

        // Approximate target UTC by adding offset difference
        const currentLocalMinuteOfDay = local.hour * 60 + local.minute;
        const targetMinuteOfDay = targetHour * 60 + targetMin;
        const diffMinutes = targetMinuteOfDay - currentLocalMinuteOfDay;

        return new Date(candidate.getTime() + diffMinutes * 60 * 1000);
    }

    return new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
}
