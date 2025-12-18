import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config";

export const uploadToS3 = async (
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
) => {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `uploads/${Date.now()}-${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3.send(command);

  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${command.input.Key}`;
};
