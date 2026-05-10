"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_CLIENT_COLLECTION_ID: CLIENT_COLLECTION_ID,
} = process.env;

export const createClient = async (clientData: any) => {
  try {
    const { database } = await createAdminClient();

    const newClient = await database.createDocument(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      ID.unique(),
      {
        ...clientData,
        totalBorrowed: 0,
        outstandingBalance: 0,
      }
    );

    revalidatePath("/clients");
    revalidatePath("/");

    return parseStringify(newClient);
  } catch (error) {
    console.error("Error creating client", error);
    return null;
  }
};

export const getClients = async () => {
  try {
    const { database } = await createAdminClient();

    const clients = await database.listDocuments(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    return parseStringify(clients.documents);
  } catch (error) {
    console.error("Error fetching clients", error);
    return null;
  }
};

export const getClientById = async (clientId: string) => {
  try {
    const { database } = await createAdminClient();

    const client = await database.getDocument(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      clientId
    );

    return parseStringify(client);
  } catch (error) {
    console.error("Error fetching client by ID", error);
    return null;
  }
};

export const updateClient = async (clientId: string, clientData: any) => {
  try {
    const { database } = await createAdminClient();

    const updatedClient = await database.updateDocument(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      clientId,
      clientData
    );

    revalidatePath("/clients");
    revalidatePath("/");

    return parseStringify(updatedClient);
  } catch (error) {
    console.error("Error updating client", error);
    return null;
  }
};
