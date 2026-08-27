import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(uid: string, email?: string, displayName?: string, photoUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email: email || '',
        displayName: displayName || '',
        photoUrl: photoUrl || '',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: email || '',
          displayName: displayName || '',
          photoUrl: photoUrl || '',
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database user upsert failed:", error);
    throw new Error("Database user upsert failed.", { cause: error });
  }
}

export async function getUsers() {
  try {
    return await db.select().from(users);
  } catch (error) {
    console.error("Database getUsers query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
