import { normalizeMealTimingType } from './mealTimings.js';

export const ATTENDANCE_QR_REQUIRED_FIELD = 'meal_type';
export const ATTENDANCE_QR_EXPECTED_FORMAT = '{"meal_type":"breakfast"}';

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

        return {
            ...result,
            parsedValue,
            mealType,
            mealId,
            userId,
            qrToken,
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
