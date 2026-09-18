export const bhytCategories = ['student', 'student_custom', 'household', 'poor', 'near_poor', 'commune_free', 'other'] as const;
export const isSpecialBhytCategory = (category?: string | null) => !!category && category !== 'student';
