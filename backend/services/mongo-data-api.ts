import { z } from "zod";

const env = {
  endpoint: process.env.MONGODB_DATA_API_ENDPOINT ?? "",
  apiKey: process.env.MONGODB_DATA_API_KEY ?? "",
  dataSource: process.env.MONGODB_DATA_SOURCE ?? "Cluster0",
  database: process.env.MONGODB_DATABASE ?? "",
};

export type MongoDataApiConfig = typeof env;

function ensureMongoEnv() {
  if (!env.endpoint || !env.apiKey || !env.dataSource || !env.database) {
    throw new Error(
      "Missing MongoDB Data API env. Required: MONGODB_DATA_API_ENDPOINT, MONGODB_DATA_API_KEY, MONGODB_DATA_SOURCE, MONGODB_DATABASE"
    );
  }
}

async function callDataApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  ensureMongoEnv();
  const res = await fetch(`${env.endpoint}/action/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.apiKey,
    },
    body: JSON.stringify({
      dataSource: env.dataSource,
      database: env.database,
      ...(body as Record<string, unknown>),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MongoDB Data API error ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export const ObjectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/)
  .describe("24-char hex ObjectId");

export async function listDocuments<T = unknown>(
  collection: string,
  filter?: Record<string, unknown>,
  sort?: Record<string, 1 | -1>,
  limit?: number
): Promise<{ documents: T[] }>
{
  return callDataApi<{ documents: T[] }>("find", {
    collection,
    filter: filter ?? {},
    sort: sort ?? { _id: -1 },
    limit: limit ?? 50,
  });
}

export async function getDocumentById<T = unknown>(
  collection: string,
  id: string
): Promise<{ document: T | null }>
{
  return callDataApi<{ document: T | null }>("findOne", {
    collection,
    filter: { _id: { $oid: id } },
  });
}

export async function insertOne<T = unknown>(
  collection: string,
  doc: T
): Promise<{ insertedId: string }>
{
  const result = await callDataApi<{ insertedId: { $oid: string } }>(
    "insertOne",
    { collection, document: doc }
  );
  return { insertedId: result.insertedId.$oid };
}

export async function updateOne(
  collection: string,
  id: string,
  update: Record<string, unknown>
): Promise<{ matchedCount: number; modifiedCount: number }>
{
  const res = await callDataApi<{ matchedCount: number; modifiedCount: number }>(
    "updateOne",
    {
      collection,
      filter: { _id: { $oid: id } },
      update: { $set: update },
    }
  );
  return res;
}

export async function deleteOne(
  collection: string,
  id: string
): Promise<{ deletedCount: number }>
{
  return callDataApi<{ deletedCount: number }>("deleteOne", {
    collection,
    filter: { _id: { $oid: id } },
  });
}
