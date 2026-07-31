import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const driverName = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

/**
 * Saves a file buffer and returns a publicly reachable URL/path for it.
 * `originalName` is only used to preserve the file extension.
 */
async function saveLocal(buffer, originalName) {
  const filename = `${uuid()}${path.extname(originalName || '')}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer);
  return { url: `/uploads/${filename}`, key: filename };
}

function deleteLocal(key) {
  const abs = path.join(UPLOAD_DIR, key);
  fs.unlink(abs, () => {});
}

// --- S3-compatible driver (AWS S3, Cloudflare R2, Backblaze B2, MinIO, etc.) ---
let s3Client = null;
async function getS3Client() {
  if (s3Client) return s3Client;
  const { S3Client } = await import('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT || undefined, // set for R2/B2/MinIO; leave unset for real AWS S3
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

async function saveS3(buffer, originalName) {
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();
  const key = `${uuid()}${path.extname(originalName || '')}`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  }));
  const publicBase = process.env.S3_PUBLIC_URL_BASE; // e.g. https://cdn.example.com or bucket's public endpoint
  const url = publicBase ? `${publicBase.replace(/\/$/, '')}/${key}` : `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}/${key}`;
  return { url, key };
}

async function deleteS3(key) {
  const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const client = await getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
}

export const storageDriver = driverName;

export async function saveFile(buffer, originalName) {
  return driverName === 's3' ? saveS3(buffer, originalName) : saveLocal(buffer, originalName);
}

export async function deleteFile(key) {
  return driverName === 's3' ? deleteS3(key) : deleteLocal(key);
}
