import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

type StorageConfig = {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

let s3: S3Client | null = null;

function getStorageConfig(): StorageConfig {
  const endpoint = process.env.MINIO_ENDPOINT;
  const region = process.env.MINIO_REGION || "us-east-1";
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET || "avatars";
  const rawPublicBase = process.env.MINIO_PUBLIC_URL || endpoint;

  if (!endpoint) {
    throw new Error("MINIO_ENDPOINT nÃ£o configurado");
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("MINIO_ACCESS_KEY ou MINIO_SECRET_KEY nÃ£o configurados");
  }

  if (!rawPublicBase) {
    throw new Error("MINIO_PUBLIC_URL nÃ£o configurado");
  }

  return {
    endpoint,
    region,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: rawPublicBase.replace(/\/$/, ""),
  };
}

function getS3Client(config: StorageConfig) {
  if (!s3) {
    s3 = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return s3;
}

function getExtensionFromContentType(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg"; // default
}

export async function uploadAvatarToMinio(
  userId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const config = getStorageConfig();
  const client = getS3Client(config);

  const ext = getExtensionFromContentType(contentType);
  const key = `${userId}.${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // URL final da imagem
  return `${config.publicBaseUrl}/${config.bucket}/${key}`;
}
