import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const client = new S3Client({
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: "auto",
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.STORAGE_BUCKET_NAME!;

export async function uploadPhoto(
  key: string,
  data: Buffer,
  mimetype: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: mimetype,
    })
  );
}

export async function deletePhoto(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
