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
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const user = await getUserInfo({ userId: session.userId });

    if (!user) {
      // Auth succeeded but no user doc found — likely first login after manual Appwrite user creation.
      // Return a minimal user object from the session so the app can still redirect.
      console.warn('No user document found for userId:', session.userId);
      return null;
    }

    return parseStringify(user);
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

      cookies().set("appwrite-session", session.secret, {
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
    console.log(error)
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    cookies().delete('appwrite-session');

    await account.deleteSession('current');
  } catch (error) {
    return null;
  }
}

// Banking logic removed.