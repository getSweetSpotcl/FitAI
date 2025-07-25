import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { createDatabaseClient, getExercises } from "../db/database";

type Bindings = {
  CACHE: KVNamespace;
  DATABASE_URL: string;
  ENVIRONMENT: string;
};

const exercises = new Hono<{ Bindings: Bindings }>();

// Get all exercises (public endpoint, no auth required)
exercises.get("/", async (c) => {
  try {
    const category = c.req.query("category");
    const muscleGroup = c.req.query("muscle_group");
    const equipment = c.req.query("equipment");
    const difficulty = c.req.query("difficulty");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get exercises from database with filters
    const exercisesData = await getExercises(sql, {
      category,
      muscle_group: muscleGroup,
      equipment,
      difficulty,
      limit,
      offset,
    });

    return c.json({
      success: true,
      data: exercisesData,
      pagination: {
        limit,
        offset,
        total: exercisesData.length, // TODO: Implement proper count query
      },
      filters: {
        category,
        muscleGroup,
        equipment,
        difficulty,
      },
    });
  } catch (error) {
    console.error("Get exercises error:", error);
    throw new HTTPException(500, { message: "Failed to get exercises" });
  }
});

// Get specific exercise
exercises.get("/:id", async (c) => {
  try {
    const exerciseId = c.req.param("id");
    
    if (!c.env?.DATABASE_URL) {
      throw new HTTPException(500, { message: "Database not configured" });
    }

    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Get exercise from database
    const result = (await sql`
      SELECT * FROM exercises 
      WHERE id = ${exerciseId}
      LIMIT 1
    `) as any;

    if ((result as any[]).length === 0) {
      throw new HTTPException(404, { message: "Exercise not found" });
    }

    const exercise = result[0];

    return c.json({
      success: true,
      data: exercise,
    });
  } catch (error) {
    console.error("Get exercise error:", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(500, { message: "Failed to get exercise" });
  }
});

// Search exercises
exercises.get("/search/:query", async (c) => {
  try {
    const query = c.req.param("query");
    const limit = parseInt(c.req.query("limit") || "20");
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    // Search exercises by name (both English and Spanish)
    const searchResults = (await sql`
      SELECT id, name, name_es, muscle_groups, equipment, difficulty
      FROM exercises 
      WHERE LOWER(name) LIKE ${`%${query.toLowerCase()}%`}
         OR LOWER(name_es) LIKE ${`%${query.toLowerCase()}%`}
      ORDER BY 
        CASE 
          WHEN LOWER(name) = ${query.toLowerCase()} THEN 1
          WHEN LOWER(name_es) = ${query.toLowerCase()} THEN 1
          WHEN LOWER(name) LIKE ${`${query.toLowerCase()}%`} THEN 2
          WHEN LOWER(name_es) LIKE ${`${query.toLowerCase()}%`} THEN 2
          ELSE 3
        END,
        name_es
      LIMIT ${limit}
    `) as any;

    return c.json({
      success: true,
      data: searchResults,
      query,
      count: (searchResults as any[]).length,
    });
  } catch (error) {
    console.error("Search exercises error:", error);
    throw new HTTPException(500, { message: "Failed to search exercises" });
  }
});

// Get exercise categories
exercises.get("/meta/categories", async (c) => {
  try {
    const sql = createDatabaseClient(c.env.DATABASE_URL);

    const categories = await sql`
      SELECT * FROM exercise_categories 
      ORDER BY name_es
    `;

    return c.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    throw new HTTPException(500, { message: "Failed to get categories" });
  }
});

// Get muscle groups
exercises.get("/meta/muscle-groups", async (c) => {
  try {
    const muscleGroups = [
      { id: "chest", name: "Chest" },
      { id: "back", name: "Back" },
      { id: "shoulders", name: "Shoulders" },
      { id: "biceps", name: "Biceps" },
      { id: "triceps", name: "Triceps" },
      { id: "legs", name: "Legs" },
      { id: "glutes", name: "Glutes" },
      { id: "core", name: "Core" },
      { id: "hamstrings", name: "Hamstrings" },
      { id: "calves", name: "Calves" },
    ];

    return c.json({
      success: true,
      data: muscleGroups,
    });
  } catch (error) {
    console.error("Get muscle groups error:", error);
    throw new HTTPException(500, { message: "Failed to get muscle groups" });
  }
});

// Get equipment types
exercises.get("/meta/equipment", async (c) => {
  try {
    const equipment = [
      { id: "barbell", name: "Barbell" },
      { id: "dumbbell", name: "Dumbbell" },
      { id: "kettlebell", name: "Kettlebell" },
      { id: "pullup_bar", name: "Pull-up Bar" },
      { id: "resistance_bands", name: "Resistance Bands" },
      { id: "bodyweight", name: "Bodyweight" },
      { id: "machine", name: "Machine" },
      { id: "cable", name: "Cable" },
    ];

    return c.json({
      success: true,
      data: equipment,
    });
  } catch (error) {
    console.error("Get equipment error:", error);
    throw new HTTPException(500, { message: "Failed to get equipment" });
  }
});

export default exercises;
