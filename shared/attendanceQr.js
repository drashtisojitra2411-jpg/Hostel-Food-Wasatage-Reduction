import { normalizeMealTimingType } from './mealTimings.js';

export const ATTENDANCE_QR_REQUIRED_FIELD = 'meal_type';
export const ATTENDANCE_QR_EXPECTED_FORMAT = '{"meal_type":"breakfast"}';

export function normalizeAttendanceMealType(value) {
    return normalizeMealTimingType(value);
}

export function buildAttendanceQrPayload(mealType) {
    const normalizedMealType = normalizeAttendanceMealType(mealType);
    if (!normalizedMealType) {
        throw new Error('Invalid meal type for attendance QR');
    }

    return JSON.stringify({ [ATTENDANCE_QR_REQUIRED_FIELD]: normalizedMealType });
}

export function parseAttendanceQrPayload(input) {
    const rawValue = input === null || input === undefined ? '' : String(input).trim();
    const result = {
        rawValue,
        parsedValue: null,
        mealType: '',
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

        return {
            ...result,
            parsedValue,
            mealType,
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
