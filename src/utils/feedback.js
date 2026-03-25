import api from '../lib/api';

/**
 * Save user feedback for a specific meal.
 * Uses upsert logic to enforce "one feedback per user/meal/day".
 * @param {Object} feedback - { user_id, user_role, day, meal_type, rating, comment, finalized_meal_id }
 */
export async function saveFeedback({ user_id, user_role, day, meal_type, rating, comment, finalized_meal_id }) {
    if (!rating) {
        return { success: false, error: 'Rating is mandatory' };
    }

    if (comment && comment.length > 300) {
        return { success: false, error: 'Comment exceeds 300 characters' };
    }

    try {
        const data = await api.post('/api/feedback', {
            user_id,
            user_role,
            day,
            meal_type,
            rating,
            comment,
            finalized_meal_id
        });

        return { success: true, data };
    } catch (error) {
        console.error('Error saving feedback:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch feedback with filters (Admin use).
 */
export async function fetchFeedback({ day, meal_type, rating, limit = 50, offset = 0 } = {}) {
    try {
        const params = new URLSearchParams();
        if (day) params.set('day', day);
        if (meal_type) params.set('meal_type', meal_type);
        if (rating) params.set('rating', rating);
        params.set('limit', limit);
        params.set('offset', offset);

        const result = await api.get(`/api/feedback?${params.toString()}`);
        return { success: true, data: result.data, count: result.count };
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Fetch latest feedback for dashboard preview.
 */
export async function fetchLatestFeedback(limit = 5) {
    return fetchFeedback({ limit });
}
