-- Legacy compatibility migration: converge historical meal_feedback installs to feedback.
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL CHECK (char_length(message) <= 300),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_anonymous BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO public.feedback (id, message, rating, meal_type, created_at, is_anonymous)
SELECT
    mf.id,
    COALESCE(NULLIF(BTRIM(mf.comment), ''), 'Legacy feedback migrated from meal_feedback'),
    mf.rating,
    mf.meal_type,
    COALESCE(mf.created_at, NOW()),
    TRUE
FROM public.meal_feedback mf
WHERE EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'meal_feedback'
)
AND NOT EXISTS (
    SELECT 1
    FROM public.feedback f
    WHERE f.id = mf.id
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_meal_type ON public.feedback(meal_type);
