'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
    )

    if (user.total === 0) return null;
    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log('getUserInfo error:', error)
    return null;
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account, database, user: userService } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const user = await getUserInfo({ userId: session.userId });

    let dbUser = user;

    if (!user) {
      console.warn('No user document found for userId:', session.userId, 'Attempting auto-recovery.');
      try {
        const authUser = await userService.get(session.userId);
        const nameParts = authUser.name ? authUser.name.split(" ") : ["System", "Admin"];
        
        dbUser = await database.createDocument(
          DATABASE_ID!,
          USER_COLLECTION_ID!,
          ID.unique(),
          {
            email: authUser.email,
            firstName: nameParts[0],
            lastName: nameParts.slice(1).join(" ") || "User",
            userId: session.userId,
            userStatus: 'active',
            role: 'ADMIN' // Recovered/Manually created users get ADMIN access safely
          }
        );
      } catch (err) {
        console.error("Failed to auto-recover user document", err);
        return null;
      }
    }

    // Fail-safe: Auto-grant ADMIN to the owner's email if they accidentally locked themselves out
    if (dbUser && dbUser.email === 'timtheesam@gmail.com' && dbUser.role !== 'ADMIN') {
      try {
        dbUser = await database.updateDocument(
          DATABASE_ID!,
          USER_COLLECTION_ID!,
          dbUser.$id,
          { role: 'ADMIN' }
        );
        console.log("Auto-escalated timtheesam@gmail.com to ADMIN.");
      } catch (err) {
        console.error("Failed to auto-escalate owner role.", err);
      }
    }

    return parseStringify(dbUser);
  } catch (error) {
    console.error('signIn Error:', error);
    return null;
  }
}

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  let newUserAccount;

  try {
    const { account, database, user: userService } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    if (!newUserAccount) throw new Error('Error creating user account');

    try {
      const newUserProfile = await database.createDocument(
        DATABASE_ID!,
        USER_COLLECTION_ID!,
        ID.unique(),
        {
          email: email,
          firstName: firstName,
          lastName: lastName,
          userId: newUserAccount.$id, // This is required for getUserInfo to work
          userStatus: 'active',
        }
      );

      const session = await account.createEmailPasswordSession(email, password);

      (await cookies()).set("appwrite-session", session.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });

      // Fixed: returning newUserProfile instead of undefined 'newUser'
      return parseStringify(newUserProfile);
    } catch (docError) {
      console.error('Document creation failed, rolling back auth account:', docError);
      await userService.delete(newUserAccount.$id);
      throw new Error('Failed to create user profile. Please check your Appwrite collection configuration.');
    }
  } catch (error: any) {
    console.error('signUp Error:', error);
    throw error;
  }
}

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();

    const user = await getUserInfo({ userId: result.$id })

    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    (await cookies()).delete('appwrite-session');

    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}

// Banking logic removed.