import { S3Client } from '@aws-sdk/client-s3';

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME ?? '',
    folderPrefix: process.env.AWS_FOLDER_PREFIX ?? '',
    endpoint: process.env.AWS_ENDPOINT,
  };
}

export function createS3Client() {
  const endpoint = process.env.AWS_ENDPOINT;
  return new S3Client({
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    region: process.env.AWS_REGION ?? 'auto',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
  });
}
