import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const endpoint = process.env.MINIO_ENDPOINT;
const region = process.env.MINIO_REGION || "us-east-1";
const accessKeyId = process.env.MINIO_ACCESS_KEY!;
const secretAccessKey = process.env.MINIO_SECRET_KEY!;
const bucket = process.env.MINIO_BUCKET || "avatars";

if (!endpoint) {
    throw new Error("MINIO_ENDPOINT não configurado");
}

const s3 = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

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
    const ext = getExtensionFromContentType(contentType);
    const key = `${userId}.${ext}`;

    await s3.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: "public-read", // MinIO normalmente ignora e usa a policy do bucket
        })
    );

    const baseUrl =
        process.env.MINIO_PUBLIC_URL?.replace(/\/$/, "") ||
        endpoint.replace(/\/$/, "");

    // URL final da imagem
    return `${baseUrl}/${bucket}/${key}`;
}
