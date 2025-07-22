import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { authMiddleware } from '../middleware/auth';

type Bindings = {
  DATABASE_URL: string;
  CACHE: KVNamespace;
};

type Variables = {
  user?: {
    id: string;
    email: string;
    plan: 'free' | 'premium' | 'pro';
  };
};

interface UserProfile {
  id: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  level: string;
  totalWorkouts: number;
  streakDays: number;
  achievements: Achievement[];
  stats: UserStats;
  privacy: PrivacySettings;
  joinedAt: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'strength' | 'consistency' | 'milestone' | 'special';
  earnedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface UserStats {
  totalVolume: number;
  averageRPE: number;
  strongestLifts: Array<{ exercise: string; weight: number }>;
  favoriteMuscleGroups: string[];
  totalTrainingTime: number; // minutes
}

interface PrivacySettings {
  profilePublic: boolean;
  showWorkouts: boolean;
  showStats: boolean;
  showAchievements: boolean;
  allowFollowers: boolean;
}

interface SharedRoutine {
  id: string;
  creatorId: string;
  creator: { displayName: string; avatar?: string };
  name: string;
  description: string;
  exercises: SharedExercise[];
  difficulty: number;
  estimatedDuration: number;
  tags: string[];
  category: string;
  public: boolean;
  likes: number;
  saves: number;
  createdAt: Date;
  updatedAt: Date;
}

interface SharedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: number;
  notes?: string;
  muscleGroups: string[];
}

interface SocialConnection {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'blocked';
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'team' | 'global';
  category: 'strength' | 'endurance' | 'consistency' | 'volume';
  startDate: Date;
  endDate: Date;
  rules: ChallengeRule[];
  rewards: ChallengeReward[];
  participants: number;
  status: 'upcoming' | 'active' | 'completed';
}

interface ChallengeRule {
  parameter: string;
  condition: string;
  target: number;
  unit: string;
}

interface ChallengeReward {
  position: 'winner' | 'top3' | 'top10' | 'participant';
  type: 'achievement' | 'premium_time' | 'discount';
  value: string;
}

const social = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply auth middleware to all routes
social.use('*', authMiddleware);

/**
 * Get user's social profile
 */
social.get('/profile/:userId?', async (c) => {
  try {
    const currentUser = c.get('user');
    const targetUserId = c.req.param('userId') || currentUser?.id;
    
    if (!currentUser || !targetUserId) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Check if profile exists and privacy settings
    const isOwnProfile = targetUserId === currentUser.id;
    
    // Mock profile data - in production would query database
    const mockProfile: UserProfile = {
      id: targetUserId,
      displayName: isOwnProfile ? 'Tu Perfil' : 'Carlos Entrenador',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + targetUserId,
      bio: isOwnProfile ? 
        'Apasionado del fitness, siempre buscando mejorar 💪' : 
        'Entrenador personal certificado | 5+ años de experiencia',
      level: 'Intermedio',
      totalWorkouts: isOwnProfile ? 127 : 285,
      streakDays: isOwnProfile ? 15 : 42,
      achievements: [
        {
          id: 'first_workout',
          name: 'Primer Paso',
          description: 'Completaste tu primer entrenamiento',
          icon: '🎯',
          category: 'milestone',
          earnedAt: new Date('2024-12-15'),
          rarity: 'common'
        },
        {
          id: 'consistency_week',
          name: 'Semana Perfecta',
          description: 'Entrenaste 7 días consecutivos',
          icon: '🔥',
          category: 'consistency',
          earnedAt: new Date('2025-01-10'),
          rarity: 'rare'
        },
        {
          id: 'strength_milestone',
          name: 'Fuerza Épica',
          description: 'Levantaste 100kg en press de banca',
          icon: '⚡',
          category: 'strength',
          earnedAt: new Date('2025-01-18'),
          rarity: 'epic'
        }
      ],
      stats: {
        totalVolume: 125000,
        averageRPE: 7.3,
        strongestLifts: [
          { exercise: 'Press de Banca', weight: 102.5 },
          { exercise: 'Sentadilla', weight: 140 },
          { exercise: 'Peso Muerto', weight: 160 }
        ],
        favoriteMuscleGroups: ['chest', 'legs', 'back'],
        totalTrainingTime: 3420 // minutes
      },
      privacy: {
        profilePublic: true,
        showWorkouts: isOwnProfile || true,
        showStats: isOwnProfile || true,
        showAchievements: true,
        allowFollowers: true
      },
      joinedAt: new Date('2024-11-01')
    };

    // Apply privacy filters if not own profile
    if (!isOwnProfile && !mockProfile.privacy.profilePublic) {
      throw new HTTPException(403, { message: 'Perfil privado' });
    }

    return c.json({
      success: true,
      data: mockProfile,
      isOwnProfile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo perfil' });
  }
});

/**
 * Update user's social profile
 */
social.put('/profile', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const profileData = await c.req.json() as {
      displayName?: string;
      bio?: string;
      privacy?: Partial<PrivacySettings>;
    };

    // Validate input
    if (profileData.displayName && profileData.displayName.length > 50) {
      throw new HTTPException(400, { message: 'Nombre muy largo (máximo 50 caracteres)' });
    }

    if (profileData.bio && profileData.bio.length > 200) {
      throw new HTTPException(400, { message: 'Biografía muy larga (máximo 200 caracteres)' });
    }

    // In production, update database
    console.log('Updating profile for user:', user.id, profileData);

    return c.json({
      success: true,
      message: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error actualizando perfil' });
  }
});

/**
 * Get shared routines feed
 */
social.get('/routines', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const { category, difficulty, page = '1', limit = '10' } = c.req.query();

    // Mock shared routines data
    const mockRoutines: SharedRoutine[] = [
      {
        id: 'routine_1',
        creatorId: 'user_creator_1',
        creator: {
          displayName: 'Ana Fitness',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana'
        },
        name: 'Push Pull Legs Completo',
        description: 'Rutina completa de 6 días enfocada en hipertrofia. Ideal para nivel intermedio-avanzado.',
        exercises: [
          {
            name: 'Press de Banca',
            sets: 4,
            reps: '8-10',
            rest: 120,
            notes: 'Controla la bajada, explosivo en la subida',
            muscleGroups: ['chest', 'shoulders', 'triceps']
          },
          {
            name: 'Press Inclinado con Mancuernas',
            sets: 3,
            reps: '10-12',
            rest: 90,
            muscleGroups: ['chest', 'shoulders']
          }
        ],
        difficulty: 7,
        estimatedDuration: 75,
        tags: ['hipertrofia', 'intermedio', 'gym'],
        category: 'strength',
        public: true,
        likes: 142,
        saves: 89,
        createdAt: new Date('2025-01-15'),
        updatedAt: new Date('2025-01-15')
      },
      {
        id: 'routine_2',
        creatorId: 'user_creator_2',
        creator: {
          displayName: 'Miguel Coach',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=miguel'
        },
        name: 'Fuerza Powerlifting Básico',
        description: 'Rutina de iniciación al powerlifting. Enfoque en los tres levantamientos principales.',
        exercises: [
          {
            name: 'Sentadilla',
            sets: 5,
            reps: '5',
            rest: 180,
            notes: 'Profundidad completa, mantén la espalda recta',
            muscleGroups: ['legs', 'glutes']
          },
          {
            name: 'Press de Banca',
            sets: 5,
            reps: '5',
            rest: 180,
            muscleGroups: ['chest', 'shoulders', 'triceps']
          }
        ],
        difficulty: 8,
        estimatedDuration: 90,
        tags: ['fuerza', 'powerlifting', 'avanzado'],
        category: 'strength',
        public: true,
        likes: 89,
        saves: 156,
        createdAt: new Date('2025-01-12'),
        updatedAt: new Date('2025-01-12')
      }
    ];

    // Apply filters
    let filteredRoutines = mockRoutines;
    
    if (category) {
      filteredRoutines = filteredRoutines.filter(r => r.category === category);
    }
    
    if (difficulty) {
      const difficultyNum = parseInt(difficulty);
      filteredRoutines = filteredRoutines.filter(r => r.difficulty >= difficultyNum - 1 && r.difficulty <= difficultyNum + 1);
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedRoutines = filteredRoutines.slice(startIndex, startIndex + limitNum);

    return c.json({
      success: true,
      data: {
        routines: paginatedRoutines,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredRoutines.length,
          totalPages: Math.ceil(filteredRoutines.length / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get routines error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo rutinas compartidas' });
  }
});

/**
 * Share a routine
 */
social.post('/routines', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const routineData = await c.req.json() as {
      name: string;
      description: string;
      exercises: SharedExercise[];
      difficulty: number;
      estimatedDuration: number;
      tags: string[];
      category: string;
      public: boolean;
    };

    // Validation
    if (!routineData.name || routineData.name.length > 100) {
      throw new HTTPException(400, { message: 'Nombre de rutina inválido (máximo 100 caracteres)' });
    }

    if (!routineData.exercises || routineData.exercises.length === 0) {
      throw new HTTPException(400, { message: 'La rutina debe tener al menos un ejercicio' });
    }

    if (routineData.difficulty < 1 || routineData.difficulty > 10) {
      throw new HTTPException(400, { message: 'Dificultad debe estar entre 1 y 10' });
    }

    // Create shared routine
    const sharedRoutine: SharedRoutine = {
      id: `routine_${Date.now()}`,
      creatorId: user.id,
      creator: {
        displayName: 'Tu Usuario', // Would get from profile
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
      },
      ...routineData,
      likes: 0,
      saves: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('Creating shared routine:', sharedRoutine);

    return c.json({
      success: true,
      data: sharedRoutine,
      message: 'Rutina compartida exitosamente'
    });

  } catch (error) {
    console.error('Share routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error compartiendo rutina' });
  }
});

/**
 * Like/Unlike a routine
 */
social.post('/routines/:routineId/like', async (c) => {
  try {
    const user = c.get('user');
    const routineId = c.req.param('routineId');
    
    if (!user || !routineId) {
      throw new HTTPException(400, { message: 'Parámetros inválidos' });
    }

    // In production, toggle like in database
    const isLiked = Math.random() > 0.5; // Mock current like status
    const newLikesCount = Math.floor(Math.random() * 200) + 50;

    return c.json({
      success: true,
      data: {
        liked: !isLiked,
        likesCount: newLikesCount + (isLiked ? -1 : 1)
      },
      message: isLiked ? 'Like removido' : 'Rutina marcada como favorita'
    });

  } catch (error) {
    console.error('Like routine error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error procesando like' });
  }
});

/**
 * Get user's achievements
 */
social.get('/achievements', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Mock achievements data
    const allAchievements = [
      {
        id: 'first_workout',
        name: 'Primer Paso',
        description: 'Completa tu primer entrenamiento',
        icon: '🎯',
        category: 'milestone',
        rarity: 'common',
        earnedAt: new Date('2024-12-15'),
        earned: true
      },
      {
        id: 'consistency_week',
        name: 'Semana Perfecta',
        description: 'Entrena 7 días consecutivos',
        icon: '🔥',
        category: 'consistency',
        rarity: 'rare',
        earnedAt: new Date('2025-01-10'),
        earned: true
      },
      {
        id: 'strength_100kg',
        name: 'Fuerza Centenaria',
        description: 'Levanta 100kg en press de banca',
        icon: '⚡',
        category: 'strength',
        rarity: 'epic',
        earnedAt: null,
        earned: false,
        progress: 85 // 85kg current
      },
      {
        id: 'marathon_month',
        name: 'Maratón Mensual',
        description: 'Entrena 20 días en un mes',
        icon: '🏃',
        category: 'consistency',
        rarity: 'rare',
        earnedAt: null,
        earned: false,
        progress: 15 // 15/20 days
      },
      {
        id: 'social_sharer',
        name: 'Inspirador',
        description: 'Comparte 10 rutinas exitosas',
        icon: '📤',
        category: 'special',
        rarity: 'epic',
        earnedAt: null,
        earned: false,
        progress: 3 // 3/10 routines
      }
    ];

    const earnedAchievements = allAchievements.filter(a => a.earned);
    const availableAchievements = allAchievements.filter(a => !a.earned);

    return c.json({
      success: true,
      data: {
        earned: earnedAchievements,
        available: availableAchievements,
        stats: {
          totalEarned: earnedAchievements.length,
          totalAvailable: allAchievements.length,
          rareCount: earnedAchievements.filter(a => a.rarity === 'rare').length,
          epicCount: earnedAchievements.filter(a => a.rarity === 'epic').length,
          legendaryCount: earnedAchievements.filter(a => a.rarity === 'legendary').length
        }
      }
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo logros' });
  }
});

/**
 * Get active challenges
 */
social.get('/challenges', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    // Mock challenges data
    const challenges: Challenge[] = [
      {
        id: 'january_consistency',
        name: 'Enero Constante',
        description: 'Entrena al menos 20 días durante enero. ¡Empieza el año fuerte!',
        type: 'global',
        category: 'consistency',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        rules: [
          {
            parameter: 'workout_days',
            condition: 'min',
            target: 20,
            unit: 'days'
          }
        ],
        rewards: [
          {
            position: 'participant',
            type: 'achievement',
            value: 'Logro "Año Nuevo, Yo Nuevo"'
          },
          {
            position: 'top10',
            type: 'premium_time',
            value: '1 mes FitAI Premium gratis'
          }
        ],
        participants: 1247,
        status: 'active'
      },
      {
        id: 'bench_press_masters',
        name: 'Maestros del Press',
        description: 'Compite por el mejor press de banca relativo a tu peso corporal',
        type: 'individual',
        category: 'strength',
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-02-15'),
        rules: [
          {
            parameter: 'bench_press_ratio',
            condition: 'max',
            target: 1.5,
            unit: 'x body weight'
          }
        ],
        rewards: [
          {
            position: 'winner',
            type: 'achievement',
            value: 'Logro "Rey del Press" + 3 meses Premium'
          },
          {
            position: 'top3',
            type: 'premium_time',
            value: '1 mes FitAI Premium gratis'
          }
        ],
        participants: 89,
        status: 'active'
      },
      {
        id: 'team_volume',
        name: 'Volumen en Equipo',
        description: 'Únete a un equipo y compitan por el mayor volumen total de entrenamiento',
        type: 'team',
        category: 'volume',
        startDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-28'),
        rules: [
          {
            parameter: 'team_total_volume',
            condition: 'max',
            target: 100000,
            unit: 'kg'
          }
        ],
        rewards: [
          {
            position: 'winner',
            type: 'achievement',
            value: 'Logro "Equipo Invencible" para todos'
          }
        ],
        participants: 0,
        status: 'upcoming'
      }
    ];

    const activechallenges = challenges.filter(c => c.status === 'active');
    const upcomingChallenges = challenges.filter(c => c.status === 'upcoming');

    return c.json({
      success: true,
      data: {
        active: activechallenges,
        upcoming: upcomingChallenges,
        myParticipations: [
          {
            challengeId: 'january_consistency',
            progress: 15, // 15/20 days
            rank: 234,
            onTrack: true
          }
        ]
      }
    });

  } catch (error) {
    console.error('Get challenges error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo desafíos' });
  }
});

/**
 * Join a challenge
 */
social.post('/challenges/:challengeId/join', async (c) => {
  try {
    const user = c.get('user');
    const challengeId = c.req.param('challengeId');
    
    if (!user || !challengeId) {
      throw new HTTPException(400, { message: 'Parámetros inválidos' });
    }

    // In production, add user to challenge
    console.log(`User ${user.id} joining challenge ${challengeId}`);

    return c.json({
      success: true,
      message: '¡Te has unido al desafío exitosamente!',
      data: {
        challengeId,
        joinedAt: new Date(),
        initialProgress: 0
      }
    });

  } catch (error) {
    console.error('Join challenge error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error uniéndose al desafío' });
  }
});

/**
 * Get leaderboards
 */
social.get('/leaderboards', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      throw new HTTPException(401, { message: 'Usuario no autenticado' });
    }

    const { period = 'weekly', category = 'volume' } = c.req.query();

    // Mock leaderboard data
    const leaderboard = [
      {
        rank: 1,
        user: {
          id: 'user_1',
          displayName: 'Ana PowerLifter',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ana1'
        },
        value: 25680,
        unit: 'kg',
        change: '+2' // positions
      },
      {
        rank: 2,
        user: {
          id: 'user_2',
          displayName: 'Carlos Beast',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos'
        },
        value: 24150,
        unit: 'kg',
        change: '-1'
      },
      {
        rank: 3,
        user: {
          id: 'user_3',
          displayName: 'María Strong',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=maria'
        },
        value: 23840,
        unit: 'kg',
        change: '+5'
      },
      // ... more entries
      {
        rank: 47,
        user: {
          id: user.id,
          displayName: 'Tú',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
        },
        value: 12450,
        unit: 'kg',
        change: '+3'
      }
    ];

    return c.json({
      success: true,
      data: {
        leaderboard,
        userPosition: leaderboard.find(entry => entry.user.id === user.id),
        metadata: {
          period,
          category,
          totalParticipants: 2847,
          lastUpdated: new Date()
        }
      }
    });

  } catch (error) {
    console.error('Get leaderboards error:', error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: 'Error obteniendo clasificaciones' });
  }
});

export default social;