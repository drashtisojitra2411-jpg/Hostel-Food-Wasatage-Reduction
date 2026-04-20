import { normalizeMealTimingType } from './mealTimings.js';

export const ATTENDANCE_QR_REQUIRED_FIELD = 'meal_type';
export const ATTENDANCE_QR_EXPECTED_FORMAT = '{"meal_type":"breakfast","date":"2026-04-20","expires_at":"2026-04-20T10:00:00.000Z"}';

export function normalizeAttendanceMealType(value) {
    return normalizeMealTimingType(value);
}

export function buildAttendanceQrPayload(input) {
    const payload = typeof input === 'object' && input !== null
        ? input
        : { mealType: input };

    const normalizedMealType = normalizeAttendanceMealType(
        payload.mealType ?? payload.meal_type ?? payload.meal
    );
    if (!normalizedMealType) {
        throw new Error('Invalid meal type for attendance QR');
    }

    const qrPayload = { [ATTENDANCE_QR_REQUIRED_FIELD]: normalizedMealType };

    if (payload.date) {
        qrPayload.date = String(payload.date);
    }

    if (payload.expiresAt || payload.expires_at) {
        qrPayload.expires_at = String(payload.expiresAt || payload.expires_at);
    }

    if (payload.mealId || payload.meal_id) {
        qrPayload.meal_id = String(payload.mealId || payload.meal_id);
    }

    if (payload.userId || payload.user_id) {
        qrPayload.user_id = String(payload.userId || payload.user_id);
    }

    if (payload.qrToken || payload.qr_token) {
        qrPayload.qr_token = String(payload.qrToken || payload.qr_token);
    }

    return JSON.stringify(qrPayload);
}

export function parseAttendanceQrPayload(input) {
    const rawValue = input === null || input === undefined ? '' : String(input).trim();
    const result = {
        rawValue,
        parsedValue: null,
        mealType: '',
        mealId: '',
        userId: '',
        qrToken: '',
        date: '',
        expiresAt: '',
        format: ATTENDANCE_QR_EXPECTED_FORMAT,
        isValid: false,
        reason: rawValue ? 'missing_required_data' : 'empty'
    };

    if (!rawValue) {
        return result;
    }

    const directMealType = normalizeAttendanceMealType(rawValue);
    if (directMealType) {
        return {
            ...result,
            parsedValue: rawValue,
            mealType: directMealType,
            isValid: true,
            reason: 'ok'
        };
    }

    if (!rawValue.startsWith('{')) {
        return {
            ...result,
            parsedValue: rawValue,
            reason: 'missing_required_data'
        };
    }

    try {
        const parsedValue = JSON.parse(rawValue);
        const mealType = normalizeAttendanceMealType(
            parsedValue?.meal_type ??
            parsedValue?.mealType ??
            parsedValue?.meal
        );
        const mealId = parsedValue?.meal_id ? String(parsedValue.meal_id) : '';
        const userId = parsedValue?.user_id ? String(parsedValue.user_id) : '';
        const qrToken = parsedValue?.qr_token ? String(parsedValue.qr_token) : '';
        const date = parsedValue?.date ? String(parsedValue.date) : '';
        const expiresAt = parsedValue?.expires_at ? String(parsedValue.expires_at) : '';

        return {
            ...result,
            parsedValue,
            mealType,
            mealId,
            userId,
            qrToken,
            date,
            expiresAt,
            isValid: Boolean(mealType),
            reason: mealType ? 'ok' : 'missing_required_data'
        };
    } catch {
        return {
            ...result,
            reason: 'parse_error'
        };
    }
}
