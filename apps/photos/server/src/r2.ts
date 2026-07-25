/**
 * R2 direct-upload URL generation.
 *
 * Prod: presigned S3-compat PUT URLs so phones upload straight to R2 without
 * the file passing through the Worker.
 * Dev: the four R2_* env values are absent (deliberately not in wrangler.toml
 * [secrets] required), so we fall back to worker-relative /api/dev-upload/*
 * URLs that write to wrangler's local simulated bucket via the binding. The
 * client just PUTs to whatever URL it's given.
 */

import { AwsClient } from 'aws4fetch'
import type { Env } from './types'

export function canPresign(env: Env): boolean {
  return !!(
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_ACCOUNT_ID &&
    env.R2_BUCKET_NAME
  )
}

const UPLOAD_URL_EXPIRY_SECS = 900 // 15 min — enough for a 25-photo batch on camp wifi

async function presignPut(env: Env, key: string): Promise<string> {
  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID!,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
    service: 's3',
    region: 'auto',
  })
  const url = new URL(`https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`)
  url.searchParams.set('X-Amz-Expires', String(UPLOAD_URL_EXPIRY_SECS))
  // signQuery signs only host/path/query, so the client's Content-Type header
  // is accepted as-is and stored as the object's content type
  const signed = await client.sign(new Request(url, { method: 'PUT' }), {
    aws: { signQuery: true },
  })
  return signed.url
}

export async function uploadUrlFor(env: Env, key: string): Promise<string> {
  if (canPresign(env)) {
    return presignPut(env, key)
  }
  // Relative URL: resolves against the app origin, hits the Vite proxy → Worker
  return `/photos/api/dev-upload/${key}`
}
