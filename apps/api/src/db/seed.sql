-- Datos de ejemplo para FitAI

-- Insertar categorías de ejercicios
INSERT INTO exercise_categories (id, name, name_es, description, description_es) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Compound', 'Compuestos', 'Multi-joint exercises that work multiple muscle groups', 'Ejercicios multi-articulares que trabajan múltiples grupos musculares'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Isolation', 'Aislamiento', 'Single-joint exercises targeting specific muscles', 'Ejercicios mono-articulares que se enfocan en músculos específicos'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Cardio', 'Cardio', 'Cardiovascular exercises for endurance', 'Ejercicios cardiovasculares para resistencia'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Functional', 'Funcional', 'Real-world movement patterns', 'Patrones de movimiento del mundo real');

-- Insertar ejercicios básicos
INSERT INTO exercises (id, name, name_es, category_id, muscle_groups, equipment, difficulty, instructions, instructions_es, tips, tips_es, common_mistakes, common_mistakes_es, is_compound) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440011',
        'Bench Press',
        'Press de Banca',
        '550e8400-e29b-41d4-a716-446655440001',
        ARRAY['chest', 'shoulders', 'triceps'],
        'barbell',
        'intermediate',
        ARRAY['Lie on bench with eyes under the bar', 'Grip bar with hands slightly wider than shoulders', 'Lower bar to chest with control', 'Press bar up until arms are extended'],
        ARRAY['Acuéstate en el banco con los ojos bajo la barra', 'Agarra la barra con las manos ligeramente más anchas que los hombros', 'Baja la barra al pecho con control', 'Empuja la barra hasta que los brazos estén extendidos'],
        ARRAY['Keep shoulder blades retracted', 'Maintain arch in lower back', 'Touch chest at nipple line'],
        ARRAY['Mantén los omóplatos retraídos', 'Mantén el arco en la espalda baja', 'Toca el pecho a la altura del pezón'],
        ARRAY['Bouncing bar off chest', 'Flaring elbows too wide', 'Arching back excessively'],
        ARRAY['Rebotar la barra en el pecho', 'Abrir mucho los codos', 'Arquear excesivamente la espalda'],
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440012',
        'Deadlift',
        'Peso Muerto',
        '550e8400-e29b-41d4-a716-446655440001',
        ARRAY['back', 'glutes', 'hamstrings', 'traps'],
        'barbell',
        'advanced',
        ARRAY['Stand with feet hip-width apart', 'Bend at hips and knees to grip bar', 'Keep back straight, chest up', 'Drive through heels to stand up'],
        ARRAY['Párate con los pies al ancho de las caderas', 'Flexiona caderas y rodillas para agarrar la barra', 'Mantén la espalda recta, pecho arriba', 'Empuja a través de los talones para pararte'],
        ARRAY['Keep bar close to body', 'Engage lats to protect spine', 'Fully extend hips at top'],
        ARRAY['Mantén la barra cerca del cuerpo', 'Activa los dorsales para proteger la columna', 'Extiende completamente las caderas arriba'],
        ARRAY['Rounding the back', 'Bar drifting away from body', 'Looking up during lift'],
        ARRAY['Redondear la espalda', 'La barra se aleja del cuerpo', 'Mirar hacia arriba durante el levantamiento'],
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440013',
        'Back Squat',
        'Sentadilla Trasera',
        '550e8400-e29b-41d4-a716-446655440001',
        ARRAY['legs', 'glutes', 'core'],
        'barbell',
        'intermediate',
        ARRAY['Position bar on upper back', 'Stand with feet shoulder-width apart', 'Descend by bending at hips and knees', 'Drive through heels to return to start'],
        ARRAY['Posiciona la barra en la espalda alta', 'Párate con los pies al ancho de los hombros', 'Desciende flexionando caderas y rodillas', 'Empuja a través de los talones para volver al inicio'],
        ARRAY['Keep knees aligned with toes', 'Descend until thighs are parallel', 'Keep core engaged throughout'],
        ARRAY['Mantén las rodillas alineadas con los dedos de los pies', 'Desciende hasta que los muslos estén paralelos', 'Mantén el core activado'],
        ARRAY['Knees caving inward', 'Not reaching proper depth', 'Leaning too far forward'],
        ARRAY['Rodillas cayendo hacia adentro', 'No llegar a la profundidad correcta', 'Inclinarse demasiado hacia adelante'],
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440014',
        'Overhead Press',
        'Press Militar',
        '550e8400-e29b-41d4-a716-446655440001',
        ARRAY['shoulders', 'triceps', 'core'],
        'barbell',
        'intermediate',
        ARRAY['Stand with bar at shoulder height', 'Grip bar with hands shoulder-width apart', 'Press bar straight up overhead', 'Lower bar back to shoulders'],
        ARRAY['Párate con la barra a la altura de los hombros', 'Agarra la barra con las manos al ancho de los hombros', 'Empuja la barra directo hacia arriba', 'Baja la barra de vuelta a los hombros'],
        ARRAY['Keep core tight', 'Press bar in straight line', 'Fully extend arms overhead'],
        ARRAY['Mantén el core tenso', 'Empuja la barra en línea recta', 'Extiende completamente los brazos'],
        ARRAY['Pressing behind neck', 'Arching back excessively', 'Using legs to assist'],
        ARRAY['Empujar detrás del cuello', 'Arquear excesivamente la espalda', 'Usar las piernas para ayudar'],
        true
    ),
    (
        '550e8400-e29b-41d4-a716-446655440015',
        'Pull-Up',
        'Dominada',
        '550e8400-e29b-41d4-a716-446655440001',
        ARRAY['back', 'biceps'],
        'pullup_bar',
        'intermediate',
        ARRAY['Hang from bar with palms facing away', 'Pull body up until chin clears bar', 'Lower body back to full hang', 'Repeat for desired reps'],
        ARRAY['Cuélgate de la barra con las palmas hacia afuera', 'Tira del cuerpo hasta que el mentón pase la barra', 'Baja el cuerpo de vuelta al cuelgue completo', 'Repite las repeticiones deseadas'],
        ARRAY['Engage lats and squeeze shoulder blades', 'Avoid swinging or kipping', 'Control the negative portion'],
        ARRAY['Activa los dorsales y aprieta los omóplatos', 'Evita balancearte', 'Controla la parte negativa'],
        ARRAY['Using momentum', 'Not achieving full range of motion', 'Shrugging shoulders'],
        ARRAY['Usar impulso', 'No lograr el rango completo de movimiento', 'Encoger los hombros'],
        true
    );

-- Insertar logros básicos
INSERT INTO achievements (id, name, name_es, description, description_es, icon, criteria, points, rarity) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440021',
        'First Workout',
        'Primer Entrenamiento',
        'Complete your first workout session',
        'Completa tu primera sesión de entrenamiento',
        '🎯',
        '{"type": "workout_count", "value": 1}',
        10,
        'common'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440022',
        'Week Warrior',
        'Guerrero de la Semana',
        'Complete 7 workouts in one week',
        'Completa 7 entrenamientos en una semana',
        '⚡',
        '{"type": "workouts_per_week", "value": 7}',
        50,
        'rare'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440023',
        'Consistency King',
        'Rey de la Consistencia',
        'Complete workouts for 30 consecutive days',
        'Completa entrenamientos por 30 días consecutivos',
        '👑',
        '{"type": "consecutive_days", "value": 30}',
        100,
        'epic'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440024',
        'Bench Beast',
        'Bestia del Press',
        'Bench press your bodyweight',
        'Haz press de banca con tu peso corporal',
        '💪',
        '{"type": "exercise_pr", "exercise": "bench_press", "multiplier": 1.0}',
        75,
        'rare'
    );

-- Insertar usuario demo
INSERT INTO users (id, email, password_hash, name, plan, fitness_level, goals, height_cm, weight_kg) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440031',
        'demo@fitai.cl',
        '$2b$10$dummy.hash.for.demo.user.password', -- En producción usar hash real
        'Usuario Demo',
        'premium',
        'intermediate',
        ARRAY['muscle_gain', 'strength'],
        175,
        80.5
    );

-- Insertar rutina de ejemplo
INSERT INTO routines (id, user_id, name, description, difficulty, duration_weeks, days_per_week, goals, equipment_needed, generated_by_ai) VALUES
    (
        '550e8400-e29b-41d4-a716-446655440041',
        '550e8400-e29b-41d4-a716-446655440031',
        'Push/Pull/Legs - Principiante',
        'Rutina de 3 días enfocada en empuje, tracción y piernas',
        'beginner',
        12,
        3,
        ARRAY['muscle_gain', 'strength'],
        ARRAY['barbell', 'dumbbell', 'pullup_bar'],
        true
    );

-- Insertar días de rutina
INSERT INTO routine_days (id, routine_id, day_of_week, name, description, estimated_duration_minutes) VALUES
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440041', 1, 'Día de Empuje', 'Pecho, hombros y tríceps', 60),
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440041', 3, 'Día de Tracción', 'Espalda y bíceps', 60),
    ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440041', 5, 'Día de Piernas', 'Piernas y glúteos', 60);

-- Insertar ejercicios de la rutina
INSERT INTO routine_exercises (routine_day_id, exercise_id, order_in_day, target_sets, target_reps_min, target_reps_max, rest_time_seconds, rpe_target) VALUES
    -- Día de Empuje
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440011', 1, 4, 6, 8, 180, 8), -- Bench Press
    ('550e8400-e29b-41d4-a716-446655440051', '550e8400-e29b-41d4-a716-446655440014', 2, 3, 8, 10, 120, 7), -- Overhead Press
    
    -- Día de Tracción  
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440012', 1, 4, 5, 6, 240, 8), -- Deadlift
    ('550e8400-e29b-41d4-a716-446655440052', '550e8400-e29b-41d4-a716-446655440015', 2, 3, 6, 8, 150, 7), -- Pull-Up
    
    -- Día de Piernas
    ('550e8400-e29b-41d4-a716-446655440053', '550e8400-e29b-41d4-a716-446655440013', 1, 4, 6, 8, 180, 8); -- Back Squat