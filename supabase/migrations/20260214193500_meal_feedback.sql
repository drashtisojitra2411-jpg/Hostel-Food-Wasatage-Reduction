-- Create meal_feedback table
CREATE TABLE IF NOT EXISTS public.meal_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT CHECK (char_length(comment) <= 300),
    finalized_meal_id TEXT, -- The ID of the meal option from XML
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Prevent duplicate feedback per user/meal/day
    UNIQUE(user_id, day, meal_type)
);

-- Enable RLS
ALTER TABLE public.meal_feedback ENABLE ROW LEVEL SECURITY;

-- Students can insert feedback for themselves
CREATE POLICY "Users can insert own feedback"
ON public.meal_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Students can update their own feedback (for the overwrite logic)
CREATE POLICY "Users can update own feedback"
ON public.meal_feedback FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Students can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.meal_feedback FOR SELECT
USING (auth.uid() = user_id);

-- Admins/Managers can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.meal_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    JOIN public.roles ON user_profiles.role_id = roles.id
    WHERE user_profiles.id = auth.uid()
    AND roles.name IN ('super_admin', 'hostel_admin', 'mess_manager')
  )
);
