import { DatabaseClient } from '../db/database';
import type {
  UserSocialProfile,
  SocialConnection,
  SharedRoutine,
  WorkoutPost,
  Challenge,
  ChallengeParticipant,
  CommunityGroup,
  GroupMembership,
  GroupPost,
  SocialNotification,
  Leaderboard,
  UserBadge,
  UpdateSocialProfileRequest,
  CreateSharedRoutineRequest,
  CreateWorkoutPostRequest,
  CreateChallengeRequest,
  CreateCommunityGroupRequest,
  CreateGroupPostRequest,
  SocialFeedQuery,
  SharedRoutinesQuery,
  ChallengesQuery,
  LeaderboardQuery
} from '../types/social';

export class SocialService {
  constructor(private sql: DatabaseClient) {}

  // ==================== USER PROFILES ====================

  /**
   * Get or create user social profile
   */
  async getUserSocialProfile(userId: string): Promise<UserSocialProfile | null> {
    try {
      const result = await this.sql`
        SELECT * FROM user_social_profiles
        WHERE user_id = ${userId}
      `;

      if ((result as any[]).length === 0) {
        // Create default profile if doesn't exist
        return await this.createDefaultSocialProfile(userId);
      }

      return this.mapSocialProfile((result as any[])[0]);
    } catch (error) {
      console.error('Get social profile error:', error);
      throw new Error('Failed to get social profile');
    }
  }

  /**
   * Update user social profile
   */
  async updateSocialProfile(userId: string, updates: UpdateSocialProfileRequest): Promise<UserSocialProfile> {
    try {
      // Build individual update clauses with direct parameterization
      const updateParts: string[] = [];
      let valueIndex = 0;
      
      if (updates.displayName) {
        updateParts.push(`display_name = '${updates.displayName.replace(/'/g, "''")}'`);
      }
      if (updates.bio !== undefined) {
        updateParts.push(`bio = ${updates.bio ? `'${updates.bio.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (updates.avatarUrl !== undefined) {
        updateParts.push(`avatar_url = ${updates.avatarUrl ? `'${updates.avatarUrl.replace(/'/g, "''")}'` : 'NULL'}`);
      }
      if (updates.fitnessLevel) {
        updateParts.push(`fitness_level = '${updates.fitnessLevel}'`);
      }
      if (updates.yearsTraining !== undefined) {
        updateParts.push(`years_training = ${updates.yearsTraining}`);
      }
      if (updates.preferredWorkoutTypes) {
        updateParts.push(`preferred_workout_types = '${JSON.stringify(updates.preferredWorkoutTypes).replace(/'/g, "''")}'`);
      }
      
      // Handle privacy settings
      if (updates.privacy) {
        const privacy = updates.privacy;
        if (privacy.profilePublic !== undefined) {
          updateParts.push(`profile_public = ${privacy.profilePublic}`);
        }
        if (privacy.showWorkouts !== undefined) {
          updateParts.push(`show_workouts = ${privacy.showWorkouts}`);
        }
        if (privacy.showStats !== undefined) {
          updateParts.push(`show_stats = ${privacy.showStats}`);
        }
        if (privacy.showAchievements !== undefined) {
          updateParts.push(`show_achievements = ${privacy.showAchievements}`);
        }
        if (privacy.allowFollowers !== undefined) {
          updateParts.push(`allow_followers = ${privacy.allowFollowers}`);
        }
        if (privacy.allowChallenges !== undefined) {
          updateParts.push(`allow_challenges = ${privacy.allowChallenges}`);
        }
      }
      
      if (updateParts.length === 0) {
        throw new Error('No updates provided');
      }
      
      updateParts.push('updated_at = NOW()');
      
      const result = await this.sql.unsafe(`
        UPDATE user_social_profiles 
        SET ${updateParts.join(', ')}
        WHERE user_id = '${userId}'
        RETURNING *
      `);

      return this.mapSocialProfile(((result as unknown) as any[])[0]);
    } catch (error) {
      console.error('Update social profile error:', error);
      throw new Error('Failed to update social profile');
    }
  }

  // ==================== SOCIAL CONNECTIONS ====================

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<SocialConnection> {
    try {
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      // Check if connection already exists
      const existing = await this.sql`
        SELECT * FROM social_connections
        WHERE follower_id = ${followerId} AND following_id = ${followingId}
      `;

      if ((existing as any[]).length > 0) {
        throw new Error('Already following this user');
      }

      // Check if target user allows followers
      const targetProfile = await this.getUserSocialProfile(followingId);
      if (!targetProfile?.allowFollowers) {
        throw new Error('User does not allow followers');
      }

      // Create connection
      const result = await this.sql`
        INSERT INTO social_connections (follower_id, following_id, status, connection_type)
        VALUES (${followerId}, ${followingId}, 'accepted', 'follow')
        RETURNING *
      `;

      // Update follower counts
      await Promise.all([
        this.updateFollowCounts(followerId),
        this.updateFollowCounts(followingId)
      ]);

      // Create notification
      await this.createNotification({
        userId: followingId,
        senderId: followerId,
        notificationType: 'new_follower',
        title: 'Nuevo seguidor',
        message: 'Alguien comenzó a seguirte',
        relatedEntityType: 'user',
        relatedEntityId: followerId
      });

      return this.mapSocialConnection((result as any[])[0]);
    } catch (error) {
      console.error('Follow user error:', error);
      throw new Error('Failed to follow user');
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      await this.sql`
        DELETE FROM social_connections
        WHERE follower_id = ${followerId} AND following_id = ${followingId}
      `;

      // Update follower counts
      await Promise.all([
        this.updateFollowCounts(followerId),
        this.updateFollowCounts(followingId)
      ]);
    } catch (error) {
      console.error('Unfollow user error:', error);
      throw new Error('Failed to unfollow user');
    }
  }

  /**
   * Get user's followers
   */
  async getUserFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{ followers: SocialConnection[], total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [followers, countResult] = await Promise.all([
        this.sql`
          SELECT sc.*, usp.display_name, usp.avatar_url, usp.fitness_level
          FROM social_connections sc
          JOIN user_social_profiles usp ON sc.follower_id = usp.user_id
          WHERE sc.following_id = ${userId} AND sc.status = 'accepted'
          ORDER BY sc.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        this.sql`
          SELECT COUNT(*) as total
          FROM social_connections
          WHERE following_id = ${userId} AND status = 'accepted'
        `
      ]);

      return {
        followers: (followers as any[]).map(this.mapSocialConnectionWithUser),
        total: parseInt((countResult as any[])[0].total)
      };
    } catch (error) {
      console.error('Get followers error:', error);
      throw new Error('Failed to get followers');
    }
  }

  /**
   * Get users that a user is following
   */
  async getUserFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{ following: SocialConnection[], total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [following, countResult] = await Promise.all([
        this.sql`
          SELECT sc.*, usp.display_name, usp.avatar_url, usp.fitness_level
          FROM social_connections sc
          JOIN user_social_profiles usp ON sc.following_id = usp.user_id
          WHERE sc.follower_id = ${userId} AND sc.status = 'accepted'
          ORDER BY sc.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        this.sql`
          SELECT COUNT(*) as total
          FROM social_connections
          WHERE follower_id = ${userId} AND status = 'accepted'
        `
      ]);

      return {
        following: (following as any[]).map(this.mapSocialConnectionWithUser),
        total: parseInt((countResult as any[])[0].total)
      };
    } catch (error) {
      console.error('Get following error:', error);
      throw new Error('Failed to get following');
    }
  }

  // ==================== SHARED ROUTINES ====================

  /**
   * Share a routine
   */
  async shareRoutine(userId: string, routine: CreateSharedRoutineRequest): Promise<SharedRoutine> {
    try {
      const result = await this.sql`
        INSERT INTO shared_routines (
          user_id, name, description, difficulty, estimated_duration,
          category, tags, exercises, is_public, allow_modifications
        ) VALUES (
          ${userId}, ${routine.name}, ${routine.description || null},
          ${routine.difficulty}, ${routine.estimatedDuration || null},
          ${routine.category || null}, ${JSON.stringify(routine.tags)},
          ${JSON.stringify(routine.exercises)}, ${routine.isPublic},
          ${routine.allowModifications}
        )
        RETURNING *
      `;

      // Update user's shared routines count
      await this.sql`
        UPDATE user_social_profiles 
        SET shared_routines_count = shared_routines_count + 1
        WHERE user_id = ${userId}
      `;

      return this.mapSharedRoutine((result as any[])[0]);
    } catch (error) {
      console.error('Share routine error:', error);
      throw new Error('Failed to share routine');
    }
  }

  /**
   * Get shared routines feed
   */
  async getSharedRoutines(query: SharedRoutinesQuery): Promise<{ routines: SharedRoutine[], total: number }> {
    try {
      const { page = 1, limit = 10, category, difficulty, tags, sortBy = 'recent', userId } = query;
      const offset = (page - 1) * limit;

      let whereClause = 'sr.is_public = TRUE';
      const queryParams: any[] = [];

      if (category) {
        whereClause += ` AND sr.category = $${queryParams.length + 1}`;
        queryParams.push(category);
      }

      if (difficulty) {
        whereClause += ` AND sr.difficulty = $${queryParams.length + 1}`;
        queryParams.push(difficulty);
      }

      if (userId) {
        whereClause += ` AND sr.user_id = $${queryParams.length + 1}`;
        queryParams.push(userId);
      }

      if (tags && tags.length > 0) {
        whereClause += ` AND sr.tags ?| array[$${queryParams.length + 1}]`;
        queryParams.push(tags);
      }

      let orderClause = 'ORDER BY sr.created_at DESC';
      if (sortBy === 'popular') {
        orderClause = 'ORDER BY sr.likes_count DESC, sr.created_at DESC';
      } else if (sortBy === 'rating') {
        orderClause = 'ORDER BY sr.rating_average DESC, sr.rating_count DESC, sr.created_at DESC';
      }

      // Simplify by building query directly with safe interpolation
      let finalWhereClause = 'sr.is_public = TRUE';
      
      if (category) {
        finalWhereClause += ` AND sr.category = '${category.replace(/'/g, "''")}'`;
      }
      if (difficulty) {
        finalWhereClause += ` AND sr.difficulty = ${difficulty}`;
      }
      if (userId) {
        finalWhereClause += ` AND sr.user_id = '${userId.replace(/'/g, "''")}'`;
      }
      if (tags && tags.length > 0) {
        const tagsList = tags.map(tag => `'${tag.replace(/'/g, "''")}'`).join(',');
        finalWhereClause += ` AND sr.tags ?| array[${tagsList}]`;
      }
      
      const [routines, countResult] = await Promise.all([
        this.sql.unsafe(`
          SELECT sr.*, usp.display_name as creator_name, usp.avatar_url as creator_avatar
          FROM shared_routines sr
          JOIN user_social_profiles usp ON sr.user_id = usp.user_id
          WHERE ${finalWhereClause}
          ${orderClause}
          LIMIT ${limit} OFFSET ${offset}
        `),
        this.sql.unsafe(`
          SELECT COUNT(*) as total
          FROM shared_routines sr
          WHERE ${finalWhereClause}
        `)
      ]);

      return {
        routines: ((routines as unknown) as any[]).map(this.mapSharedRoutineWithCreator),
        total: parseInt(((countResult as unknown) as any[])[0].total)
      };
    } catch (error) {
      console.error('Get shared routines error:', error);
      throw new Error('Failed to get shared routines');
    }
  }

  /**
   * Like/unlike a routine
   */
  async toggleRoutineLike(userId: string, routineId: string): Promise<{ liked: boolean, likesCount: number }> {
    try {
      // Check if already liked
      const existing = await this.sql`
        SELECT * FROM routine_interactions
        WHERE user_id = ${userId} AND routine_id = ${routineId} AND interaction_type = 'like'
      `;

      let liked = false;

      if ((existing as any[]).length > 0) {
        // Remove like
        await this.sql`
          DELETE FROM routine_interactions
          WHERE user_id = ${userId} AND routine_id = ${routineId} AND interaction_type = 'like'
        `;
        
        await this.sql`
          UPDATE shared_routines 
          SET likes_count = likes_count - 1
          WHERE id = ${routineId}
        `;
      } else {
        // Add like
        await this.sql`
          INSERT INTO routine_interactions (user_id, routine_id, interaction_type)
          VALUES (${userId}, ${routineId}, 'like')
        `;
        
        await this.sql`
          UPDATE shared_routines 
          SET likes_count = likes_count + 1
          WHERE id = ${routineId}
        `;
        
        liked = true;

        // Create notification for routine creator
        const routine = await this.sql`
          SELECT user_id FROM shared_routines WHERE id = ${routineId}
        `;
        
        if ((routine as any[]).length > 0 && (routine as any[])[0].user_id !== userId) {
          await this.createNotification({
            userId: (routine as any[])[0].user_id,
            senderId: userId,
            notificationType: 'routine_liked',
            title: 'Rutina marcada como favorita',
            message: 'A alguien le gustó tu rutina compartida',
            relatedEntityType: 'routine',
            relatedEntityId: routineId
          });
        }
      }

      // Get updated likes count
      const updatedRoutine = await this.sql`
        SELECT likes_count FROM shared_routines WHERE id = ${routineId}
      `;

      return {
        liked,
        likesCount: (updatedRoutine as any[])[0].likes_count
      };
    } catch (error) {
      console.error('Toggle routine like error:', error);
      throw new Error('Failed to toggle routine like');
    }
  }

  // ==================== WORKOUT POSTS ====================

  /**
   * Create a workout post
   */
  async createWorkoutPost(userId: string, post: CreateWorkoutPostRequest): Promise<WorkoutPost> {
    try {
      const result = await this.sql`
        INSERT INTO workout_posts (
          user_id, workout_session_id, caption, workout_data,
          media_urls, post_type, visibility
        ) VALUES (
          ${userId}, ${post.workoutSessionId || null}, ${post.caption || null},
          ${JSON.stringify(post.workoutData || {})}, ${JSON.stringify(post.mediaUrls || [])},
          ${post.postType}, ${post.visibility}
        )
        RETURNING *
      `;

      return this.mapWorkoutPost((result as any[])[0]);
    } catch (error) {
      console.error('Create workout post error:', error);
      throw new Error('Failed to create workout post');
    }
  }

  /**
   * Get social feed for user
   */
  async getSocialFeed(userId: string, query: SocialFeedQuery): Promise<{ posts: WorkoutPost[], total: number }> {
    try {
      const { page = 1, limit = 10, feedType = 'all', contentTypes } = query;
      const offset = (page - 1) * limit;

      // Build where clause with direct string interpolation

      // Rebuild where clause with direct string interpolation
      let finalWhereClause = 'wp.visibility = \'public\'';
      
      if (feedType === 'following') {
        finalWhereClause = `(wp.visibility = 'public' OR 
          (wp.visibility = 'followers' AND wp.user_id IN (
            SELECT following_id FROM social_connections 
            WHERE follower_id = '${userId.replace(/'/g, "''")}' AND status = 'accepted'
          )))`;
      }

      if (contentTypes && contentTypes.length > 0) {
        const typesList = contentTypes.map(type => `'${type.replace(/'/g, "''")}'`).join(',');
        finalWhereClause += ` AND wp.post_type IN (${typesList})`;
      }
      
      const [posts, countResult] = await Promise.all([
        this.sql.unsafe(`
          SELECT wp.*, usp.display_name as author_name, usp.avatar_url as author_avatar
          FROM workout_posts wp
          JOIN user_social_profiles usp ON wp.user_id = usp.user_id
          WHERE ${finalWhereClause}
          ORDER BY wp.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `),
        this.sql.unsafe(`
          SELECT COUNT(*) as total
          FROM workout_posts wp
          WHERE ${finalWhereClause}
        `)
      ]);

      return {
        posts: ((posts as unknown) as any[]).map(this.mapWorkoutPostWithAuthor),
        total: parseInt(((countResult as unknown) as any[])[0].total)
      };
    } catch (error) {
      console.error('Get social feed error:', error);
      throw new Error('Failed to get social feed');
    }
  }

  // ==================== CHALLENGES ====================

  /**
   * Create a challenge
   */
  async createChallenge(creatorId: string | null, challenge: CreateChallengeRequest): Promise<Challenge> {
    try {
      const result = await this.sql`
        INSERT INTO challenges (
          creator_id, name, description, challenge_type, category,
          start_date, end_date, registration_end_date, rules,
          entry_requirements, rewards, max_participants, team_size, is_public
        ) VALUES (
          ${creatorId}, ${challenge.name}, ${challenge.description},
          ${challenge.challengeType}, ${challenge.category},
          ${challenge.startDate.toISOString()}, ${challenge.endDate.toISOString()},
          ${challenge.registrationEndDate?.toISOString() || null},
          ${JSON.stringify(challenge.rules)}, ${JSON.stringify(challenge.entryRequirements || {})},
          ${JSON.stringify(challenge.rewards)}, ${challenge.maxParticipants || null},
          ${challenge.teamSize || null}, ${challenge.isPublic}
        )
        RETURNING *
      `;

      return this.mapChallenge((result as any[])[0]);
    } catch (error) {
      console.error('Create challenge error:', error);
      throw new Error('Failed to create challenge');
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(userId: string, challengeId: string): Promise<ChallengeParticipant> {
    try {
      // Check if challenge exists and is active
      const challenge = await this.sql`
        SELECT * FROM challenges
        WHERE id = ${challengeId} AND status = 'active'
        AND (registration_end_date IS NULL OR registration_end_date >= NOW())
      `;

      if ((challenge as any[]).length === 0) {
        throw new Error('Challenge not found or registration closed');
      }

      // Check if already participating
      const existing = await this.sql`
        SELECT * FROM challenge_participants
        WHERE challenge_id = ${challengeId} AND user_id = ${userId}
      `;

      if ((existing as any[]).length > 0) {
        throw new Error('Already participating in this challenge');
      }

      // Check participant limit
      const challengeData = (challenge as any[])[0];
      if (challengeData.max_participants) {
        const currentCount = await this.sql`
          SELECT COUNT(*) as count FROM challenge_participants
          WHERE challenge_id = ${challengeId} AND status = 'active'
        `;
        
        if (parseInt((currentCount as any[])[0].count) >= challengeData.max_participants) {
          throw new Error('Challenge is full');
        }
      }

      // Join challenge
      const result = await this.sql`
        INSERT INTO challenge_participants (challenge_id, user_id, current_progress)
        VALUES (${challengeId}, ${userId}, '{}')
        RETURNING *
      `;

      // Update participants count
      await this.sql`
        UPDATE challenges 
        SET participants_count = participants_count + 1
        WHERE id = ${challengeId}
      `;

      return this.mapChallengeParticipant((result as any[])[0]);
    } catch (error) {
      console.error('Join challenge error:', error);
      throw new Error('Failed to join challenge');
    }
  }

  /**
   * Get active challenges
   */
  async getChallenges(query: ChallengesQuery): Promise<{ challenges: Challenge[], total: number }> {
    try {
      const { page = 1, limit = 10, status, category, challengeType, participating } = query;
      const offset = (page - 1) * limit;

      // Build where clause with direct string interpolation

      // Rebuild where clause with direct string interpolation
      let finalWhereClause = 'c.is_public = TRUE';
      
      if (status) {
        finalWhereClause += ` AND c.status = '${status.replace(/'/g, "''")}'`;
      }
      if (category) {
        finalWhereClause += ` AND c.category = '${category.replace(/'/g, "''")}'`;
      }
      if (challengeType) {
        finalWhereClause += ` AND c.challenge_type = '${challengeType.replace(/'/g, "''")}'`;
      }
      
      const [challenges, countResult] = await Promise.all([
        this.sql.unsafe(`
          SELECT c.*, usp.display_name as creator_name, usp.avatar_url as creator_avatar
          FROM challenges c
          LEFT JOIN user_social_profiles usp ON c.creator_id = usp.user_id
          WHERE ${finalWhereClause}
          ORDER BY c.start_date DESC
          LIMIT ${limit} OFFSET ${offset}
        `),
        this.sql.unsafe(`
          SELECT COUNT(*) as total
          FROM challenges c
          WHERE ${finalWhereClause}
        `)
      ]);

      return {
        challenges: ((challenges as unknown) as any[]).map(this.mapChallengeWithCreator),
        total: parseInt(((countResult as unknown) as any[])[0].total)
      };
    } catch (error) {
      console.error('Get challenges error:', error);
      throw new Error('Failed to get challenges');
    }
  }

  // ==================== COMMUNITY GROUPS ====================

  /**
   * Create a community group
   */
  async createCommunityGroup(creatorId: string, groupData: CreateCommunityGroupRequest): Promise<CommunityGroup> {
    try {
      const result = await this.sql`
        INSERT INTO community_groups (
          creator_id, name, description, group_type, category,
          requires_approval, allow_posts, allow_media, rules
        ) VALUES (
          ${creatorId}, ${groupData.name}, ${groupData.description || null},
          ${groupData.groupType}, ${groupData.category || null},
          ${groupData.requiresApproval}, ${groupData.allowPosts}, ${groupData.allowMedia},
          ${groupData.rules || null}
        )
        RETURNING *
      `;

      const group = (result as any[])[0];

      // Creator automatically becomes a member with admin role
      await this.sql`
        INSERT INTO group_memberships (group_id, user_id, role, status)
        VALUES (${group.id}, ${creatorId}, 'admin', 'active')
      `;

      return this.mapCommunityGroup(group);
    } catch (error) {
      console.error('Create community group error:', error);
      throw new Error('Failed to create community group');
    }
  }

  /**
   * Get community groups
   */
  async getCommunityGroups(page: number = 1, limit: number = 10, category?: string, groupType?: string): Promise<{ groups: CommunityGroup[], total: number }> {
    try {
      const offset = (page - 1) * limit;
      // Build where clause with direct string interpolation

      // Rebuild where clause with direct string interpolation
      let finalWhereClause = '1=1';
      
      if (category) {
        finalWhereClause += ` AND cg.category = '${category.replace(/'/g, "''")}'`;
      }
      if (groupType) {
        finalWhereClause += ` AND cg.group_type = '${groupType.replace(/'/g, "''")}'`;
      }
      
      const [groups, countResult] = await Promise.all([
        this.sql.unsafe(`
          SELECT cg.*, usp.display_name as creator_name, usp.avatar_url as creator_avatar
          FROM community_groups cg
          JOIN user_social_profiles usp ON cg.creator_id = usp.user_id
          WHERE ${finalWhereClause}
          ORDER BY cg.members_count DESC, cg.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `),
        this.sql.unsafe(`
          SELECT COUNT(*) as total
          FROM community_groups cg
          WHERE ${finalWhereClause}
        `)
      ]);

      return {
        groups: ((groups as unknown) as any[]).map(this.mapCommunityGroupWithCreator),
        total: parseInt(((countResult as unknown) as any[])[0].total)
      };
    } catch (error) {
      console.error('Get community groups error:', error);
      throw new Error('Failed to get community groups');
    }
  }

  /**
   * Join a community group
   */
  async joinCommunityGroup(userId: string, groupId: string): Promise<GroupMembership> {
    try {
      // Check if group exists
      const group = await this.sql`
        SELECT * FROM community_groups WHERE id = ${groupId}
      `;

      if ((group as any[]).length === 0) {
        throw new Error('Group not found');
      }

      const groupData = (group as any[])[0];

      // Check if already a member
      const existing = await this.sql`
        SELECT * FROM group_memberships
        WHERE group_id = ${groupId} AND user_id = ${userId}
      `;

      if ((existing as any[]).length > 0) {
        throw new Error('Already a member of this group');
      }

      // Check if group is private and requires approval
      const status = groupData.requires_approval ? 'pending' : 'active';

      const result = await this.sql`
        INSERT INTO group_memberships (group_id, user_id, status)
        VALUES (${groupId}, ${userId}, ${status})
        RETURNING *
      `;

      // Update member count if approved immediately
      if (status === 'active') {
        await this.sql`
          UPDATE community_groups 
          SET members_count = members_count + 1
          WHERE id = ${groupId}
        `;
      }

      // Create notification for group creator if pending approval
      if (status === 'pending') {
        await this.createNotification({
          userId: groupData.creator_id,
          senderId: userId,
          notificationType: 'group_join_request',
          title: 'Solicitud de unión al grupo',
          message: 'Alguien quiere unirse a tu grupo',
          relatedEntityType: 'group',
          relatedEntityId: groupId
        });
      }

      return this.mapGroupMembership((result as any[])[0]);
    } catch (error) {
      console.error('Join community group error:', error);
      throw new Error('Failed to join community group');
    }
  }

  /**
   * Create a group post
   */
  async createGroupPost(userId: string, groupId: string, postData: CreateGroupPostRequest): Promise<GroupPost> {
    try {
      // Check if user is member of the group
      const membership = await this.sql`
        SELECT * FROM group_memberships
        WHERE group_id = ${groupId} AND user_id = ${userId} AND status = 'active'
      `;

      if ((membership as any[]).length === 0) {
        throw new Error('Not a member of this group');
      }

      // Check if group allows posts
      const group = await this.sql`
        SELECT allow_posts FROM community_groups WHERE id = ${groupId}
      `;

      if ((group as any[]).length === 0 || !(group as any[])[0].allow_posts) {
        throw new Error('Posts not allowed in this group');
      }

      const result = await this.sql`
        INSERT INTO group_posts (
          group_id, user_id, parent_post_id, title, content,
          post_type, media_urls
        ) VALUES (
          ${groupId}, ${userId}, ${postData.parentPostId || null},
          ${postData.title || null}, ${postData.content}, ${postData.postType},
          ${JSON.stringify(postData.mediaUrls || [])}
        )
        RETURNING *
      `;

      // Update group posts count
      await this.sql`
        UPDATE community_groups 
        SET posts_count = posts_count + 1
        WHERE id = ${groupId}
      `;

      return this.mapGroupPost((result as any[])[0]);
    } catch (error) {
      console.error('Create group post error:', error);
      throw new Error('Failed to create group post');
    }
  }

  /**
   * Get group posts
   */
  async getGroupPosts(groupId: string, page: number = 1, limit: number = 10): Promise<{ posts: GroupPost[], total: number }> {
    try {
      const offset = (page - 1) * limit;

      const [posts, countResult] = await Promise.all([
        this.sql`
          SELECT gp.*, usp.display_name as author_name, usp.avatar_url as author_avatar
          FROM group_posts gp
          JOIN user_social_profiles usp ON gp.user_id = usp.user_id
          WHERE gp.group_id = ${groupId} AND gp.parent_post_id IS NULL AND gp.is_hidden = FALSE
          ORDER BY gp.is_pinned DESC, gp.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `,
        this.sql`
          SELECT COUNT(*) as total
          FROM group_posts
          WHERE group_id = ${groupId} AND parent_post_id IS NULL AND is_hidden = FALSE
        `
      ]);

      return {
        posts: (posts as any[]).map(this.mapGroupPostWithAuthor),
        total: parseInt((countResult as any[])[0].total)
      };
    } catch (error) {
      console.error('Get group posts error:', error);
      throw new Error('Failed to get group posts');
    }
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Create a notification
   */
  async createNotification(notification: {
    userId: string;
    senderId?: string;
    notificationType: string;
    title: string;
    message?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    actionData?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.sql`
        INSERT INTO social_notifications (
          user_id, sender_id, notification_type, title, message,
          related_entity_type, related_entity_id, action_data
        ) VALUES (
          ${notification.userId}, ${notification.senderId || null},
          ${notification.notificationType}, ${notification.title},
          ${notification.message || null}, ${notification.relatedEntityType || null},
          ${notification.relatedEntityId || null}, ${JSON.stringify(notification.actionData || {})}
        )
      `;
    } catch (error) {
      console.error('Create notification error:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, page: number = 1, limit: number = 20, unreadOnly: boolean = false): Promise<{ notifications: SocialNotification[], total: number, unreadCount: number }> {
    try {
      const offset = (page - 1) * limit;
      let whereClause = `user_id = '${userId}'`;
      
      if (unreadOnly) {
        whereClause += ' AND is_read = FALSE';
      }

      const notificationsQuery = `
        SELECT sn.*, usp.display_name as sender_name, usp.avatar_url as sender_avatar
        FROM social_notifications sn
        LEFT JOIN user_social_profiles usp ON sn.sender_id = usp.user_id
        WHERE ${whereClause}
        ORDER BY sn.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      const totalQuery = `
        SELECT COUNT(*) as total
        FROM social_notifications
        WHERE user_id = '${userId}'
      `;
      const unreadQuery = `
        SELECT COUNT(*) as unread
        FROM social_notifications
        WHERE user_id = '${userId}' AND is_read = FALSE
      `;
      
      const [notifications, countResult, unreadResult] = await Promise.all([
        this.sql.unsafe(notificationsQuery),
        this.sql.unsafe(totalQuery),
        this.sql.unsafe(unreadQuery)
      ]);

      return {
        notifications: ((notifications as unknown) as any[]).map(this.mapNotificationWithSender),
        total: parseInt(((countResult as unknown) as any[])[0].total),
        unreadCount: parseInt(((unreadResult as unknown) as any[])[0].unread)
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      throw new Error('Failed to get notifications');
    }
  }

  // ==================== HELPER METHODS ====================

  private async createDefaultSocialProfile(userId: string): Promise<UserSocialProfile> {
    try {
      const result = await this.sql`
        INSERT INTO user_social_profiles (user_id, display_name)
        VALUES (${userId}, 'Usuario FitAI')
        RETURNING *
      `;

      return this.mapSocialProfile((result as any[])[0]);
    } catch (error) {
      console.error('Create default profile error:', error);
      throw new Error('Failed to create default profile');
    }
  }

  private async updateFollowCounts(userId: string): Promise<void> {
    try {
      const [followersCount, followingCount] = await Promise.all([
        this.sql`
          SELECT COUNT(*) as count FROM social_connections
          WHERE following_id = ${userId} AND status = 'accepted'
        `,
        this.sql`
          SELECT COUNT(*) as count FROM social_connections
          WHERE follower_id = ${userId} AND status = 'accepted'
        `
      ]);

      await this.sql`
        UPDATE user_social_profiles
        SET 
          followers_count = ${parseInt((followersCount as any[])[0].count)},
          following_count = ${parseInt((followingCount as any[])[0].count)}
        WHERE user_id = ${userId}
      `;
    } catch (error) {
      console.error('Update follow counts error:', error);
    }
  }

  // ==================== MAPPING FUNCTIONS ====================

  private mapSocialProfile = (row: any): UserSocialProfile => ({
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    profilePublic: row.profile_public,
    showWorkouts: row.show_workouts,
    showStats: row.show_stats,
    showAchievements: row.show_achievements,
    allowFollowers: row.allow_followers,
    allowChallenges: row.allow_challenges,
    followersCount: row.followers_count || 0,
    followingCount: row.following_count || 0,
    sharedRoutinesCount: row.shared_routines_count || 0,
    likesReceived: row.likes_received || 0,
    fitnessLevel: row.fitness_level || 'beginner',
    yearsTraining: row.years_training ? parseFloat(row.years_training) : undefined,
    preferredWorkoutTypes: row.preferred_workout_types ? JSON.parse(row.preferred_workout_types) : [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapSocialConnection = (row: any): SocialConnection => ({
    id: row.id,
    followerId: row.follower_id,
    followingId: row.following_id,
    status: row.status,
    connectionType: row.connection_type,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapSocialConnectionWithUser = (row: any): any => ({
    ...this.mapSocialConnection(row),
    userProfile: {
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      fitnessLevel: row.fitness_level
    }
  });

  private mapSharedRoutine = (row: any): SharedRoutine => ({
    id: row.id,
    userId: row.user_id,
    routineId: row.routine_id,
    name: row.name,
    description: row.description,
    difficulty: row.difficulty,
    estimatedDuration: row.estimated_duration,
    category: row.category,
    tags: row.tags ? JSON.parse(row.tags) : [],
    exercises: row.exercises ? JSON.parse(row.exercises) : [],
    isPublic: row.is_public,
    allowModifications: row.allow_modifications,
    featured: row.featured || false,
    likesCount: row.likes_count || 0,
    savesCount: row.saves_count || 0,
    sharesCount: row.shares_count || 0,
    downloadsCount: row.downloads_count || 0,
    ratingAverage: row.rating_average ? parseFloat(row.rating_average) : 0,
    ratingCount: row.rating_count || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapSharedRoutineWithCreator = (row: any): SharedRoutine => ({
    ...this.mapSharedRoutine(row),
    creator: {
      displayName: row.creator_name,
      avatarUrl: row.creator_avatar
    } as any
  });

  private mapWorkoutPost = (row: any): WorkoutPost => ({
    id: row.id,
    userId: row.user_id,
    workoutSessionId: row.workout_session_id,
    caption: row.caption,
    workoutData: row.workout_data ? JSON.parse(row.workout_data) : null,
    mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
    postType: row.post_type,
    visibility: row.visibility,
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    sharesCount: row.shares_count || 0,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapWorkoutPostWithAuthor = (row: any): WorkoutPost => ({
    ...this.mapWorkoutPost(row),
    author: {
      displayName: row.author_name,
      avatarUrl: row.author_avatar
    } as any
  });

  private mapChallenge = (row: any): Challenge => ({
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    description: row.description,
    challengeType: row.challenge_type,
    category: row.category,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    registrationEndDate: row.registration_end_date ? new Date(row.registration_end_date) : undefined,
    rules: row.rules ? JSON.parse(row.rules) : [],
    entryRequirements: row.entry_requirements ? JSON.parse(row.entry_requirements) : {},
    rewards: row.rewards ? JSON.parse(row.rewards) : [],
    maxParticipants: row.max_participants,
    teamSize: row.team_size,
    isPublic: row.is_public,
    featured: row.featured || false,
    participantsCount: row.participants_count || 0,
    teamsCount: row.teams_count || 0,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapChallengeWithCreator = (row: any): Challenge => ({
    ...this.mapChallenge(row),
    creator: row.creator_name ? {
      displayName: row.creator_name,
      avatarUrl: row.creator_avatar
    } as any : undefined
  });

  private mapChallengeParticipant = (row: any): ChallengeParticipant => ({
    id: row.id,
    challengeId: row.challenge_id,
    userId: row.user_id,
    teamId: row.team_id,
    status: row.status,
    currentProgress: row.current_progress ? JSON.parse(row.current_progress) : {},
    bestResult: row.best_result ? parseFloat(row.best_result) : undefined,
    finalPosition: row.final_position,
    rewardsEarned: row.rewards_earned ? JSON.parse(row.rewards_earned) : [],
    joinedAt: new Date(row.joined_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    updatedAt: new Date(row.updated_at)
  });

  private mapNotificationWithSender = (row: any): any => ({
    id: row.id,
    userId: row.user_id,
    senderId: row.sender_id,
    notificationType: row.notification_type,
    title: row.title,
    message: row.message,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    isRead: row.is_read,
    isDismissed: row.is_dismissed,
    actionData: row.action_data ? JSON.parse(row.action_data) : {},
    sender: row.sender_name ? {
      displayName: row.sender_name,
      avatarUrl: row.sender_avatar
    } : null,
    createdAt: new Date(row.created_at),
    readAt: row.read_at ? new Date(row.read_at) : undefined
  });

  private mapCommunityGroup = (row: any): CommunityGroup => ({
    id: row.id,
    creatorId: row.creator_id,
    name: row.name,
    description: row.description,
    groupType: row.group_type,
    category: row.category,
    requiresApproval: row.requires_approval,
    allowPosts: row.allow_posts,
    allowMedia: row.allow_media,
    membersCount: row.members_count || 0,
    postsCount: row.posts_count || 0,
    moderators: row.moderators ? JSON.parse(row.moderators) : [],
    rules: row.rules,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapCommunityGroupWithCreator = (row: any): CommunityGroup => ({
    ...this.mapCommunityGroup(row),
    creator: {
      displayName: row.creator_name,
      avatarUrl: row.creator_avatar
    } as any
  });

  private mapGroupMembership = (row: any): GroupMembership => ({
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: new Date(row.joined_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapGroupPost = (row: any): GroupPost => ({
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    parentPostId: row.parent_post_id,
    title: row.title,
    content: row.content,
    postType: row.post_type,
    mediaUrls: row.media_urls ? JSON.parse(row.media_urls) : [],
    likesCount: row.likes_count || 0,
    repliesCount: row.replies_count || 0,
    isPinned: row.is_pinned || false,
    isLocked: row.is_locked || false,
    isHidden: row.is_hidden || false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  });

  private mapGroupPostWithAuthor = (row: any): GroupPost => ({
    ...this.mapGroupPost(row),
    author: {
      displayName: row.author_name,
      avatarUrl: row.author_avatar
    } as any
  });
}