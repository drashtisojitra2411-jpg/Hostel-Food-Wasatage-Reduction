export const MEAL_TIMINGS = {
    BREAKFAST: "07:30-09:30",
    LUNCH: "12:30-14:30",
    DINNER: "19:30-21:30"
};

export const MEAL_ORDER = ["breakfast", "lunch", "dinner"];

function parseWindow(windowValue) {
    const [start = "", end = ""] = String(windowValue || "").split("-");
    return { start, end };
}

export function normalizeMealTimingType(mealType) {
    const value = String(mealType || "").trim().toLowerCase();
    if (value === "breakfast" || value === "lunch" || value === "dinner") {
        return value;
    }
    return "";
}

export function getMealTimingForType(mealType) {
    const normalized = normalizeMealTimingType(mealType);
    if (!normalized) return null;

    const key = normalized.toUpperCase();
    const raw = MEAL_TIMINGS[key];
    if (!raw) return null;
    return parseWindow(raw);
}

export function toDbTime(timeHHMM) {
    const value = String(timeHHMM || "").slice(0, 5);
    return value ? `${value}:00` : "";
}

export function formatTime12h(timeHHMM) {
    const [hoursRaw, minutesRaw] = String(timeHHMM || "").split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return String(timeHHMM || "");

    const period = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

