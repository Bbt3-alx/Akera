import dotenv from "dotenv";
import AWS from "aws-sdk";
import pkg from "aws-sdk";
const { Glacier } = pkg;

dotenv.config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretKeyId: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Initialize client
const glacier = new Glacier();
const s3 = new AWS.S3();

// Archive to Glacier
export const archiveToGlacier = async (data) => {
  const params = {
    vaultName: process.env.GLACIER_VAULT_NAME,
    body: JSON.stringify(data),
  };

  try {
    const response = await glacier.uploadArchive(params).promise();
    console.log("Archived to Glacier:", response.archiveId);
    return response;
  } catch (error) {
    console.error("Glacier upload failed:", error);
    throw error;
  }
};

// Backup to S3

export const backupToS3 = async (data, key) => {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    Body: JSON.stringify(data),
  };

  try {
    const response = await s3.upload(params).promise();
    console.log("Backed up to S3:", response.Location);
    return response;
  } catch (error) {
    console.error("S3 upload failed:", error);
    throw error;
  }
};
