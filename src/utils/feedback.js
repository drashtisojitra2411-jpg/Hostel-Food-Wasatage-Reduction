import api from '../lib/api'

export const FEEDBACK_MEAL_TYPES = ['breakfast', 'lunch', 'dinner']
export const FEEDBACK_MAX_LENGTH = 300

function normalizeMessage(value = '') {
    return String(value || '').trim().slice(0, FEEDBACK_MAX_LENGTH)
}

export async function submitAnonymousFeedback({ message, rating, meal_type }) {
    const normalizedMessage = normalizeMessage(message)
    const normalizedMealType = FEEDBACK_MEAL_TYPES.includes(meal_type) ? meal_type : ''
    const hasRating = rating !== undefined && rating !== null && String(rating).trim() !== ''
    const normalizedRating = hasRating ? Number(rating) : null

    if (!normalizedMessage) {
        return { success: false, error: 'Feedback message is required' }
    }

    if (normalizedMessage.length > FEEDBACK_MAX_LENGTH) {
        return { success: false, error: `Feedback message exceeds ${FEEDBACK_MAX_LENGTH} characters` }
    }

    if (!normalizedMealType) {
        return { success: false, error: 'Meal type is required' }
    }

    if (hasRating && (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5)) {
        return { success: false, error: 'Rating must be between 1 and 5' }
    }

    try {
        const data = await api.post('/api/feedback', {
            message: normalizedMessage,
            rating: normalizedRating,
            meal_type: normalizedMealType
        })

        return { success: true, data: data?.data || data }
    } catch (error) {
        console.error('Error submitting feedback:', error)
        return { success: false, error: error.message }
    }
}

export async function fetchFeedback({ meal_type, date, rating, limit = 50, offset = 0 } = {}) {
    try {
        const params = new URLSearchParams()
        if (meal_type) params.set('meal_type', meal_type)
        if (date) params.set('date', date)
        if (rating) params.set('rating', rating)
        params.set('limit', limit)
        params.set('offset', offset)

        const result = await api.get(`/api/feedback?${params.toString()}`)
        return {
            success: true,
            data: Array.isArray(result?.data) ? result.data : [],
            count: Number(result?.count || 0)
        }
    } catch (error) {
        console.error('Error fetching feedback:', error)
        return { success: false, error: error.message, data: [], count: 0 }
    }
}

export async function fetchLatestFeedback(limit = 5) {
    return fetchFeedback({ limit })
}

export const saveFeedback = submitAnonymousFeedback
