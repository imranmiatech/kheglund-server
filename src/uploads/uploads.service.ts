import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type UploadPurpose =
  | 'AVATAR'
  | 'RESOURCE'
  | 'ARTICLE_COVER'
  | 'ANNOUNCEMENT_COVER'
  | 'OTHER';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly prisma: PrismaService) {
    const cloudName = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log(`Cloudinary initialized successfully for cloud: ${cloudName}`);
    } else {
      this.logger.warn('Cloudinary credentials not provided. Defaulting to local disk uploads.');
    }
  }

  async saveFile(
    file: Express.Multer.File,
    purpose: UploadPurpose,
    uploadedById?: string,
  ) {
    const cloudName = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET;

    const extension = extname(file.originalname) || '';
    const storageName = `${randomUUID()}${extension}`;

    let storagePath: string;

    if (cloudName && apiKey && apiSecret) {
      try {
        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'aria_community',
              resource_type: 'auto',
            },
            (error, result) => {
              if (error || !result) return reject(error);
              resolve(result);
            },
          );
          uploadStream.end(file.buffer);
        });

        storagePath = uploadResult.secure_url;
        this.logger.log(`File uploaded to Cloudinary successfully: ${storagePath}`);
      } catch (err) {
        this.logger.error('Cloudinary upload failed, falling back to local disk storage:', err);
        storagePath = await this.saveToLocalDisk(file, storageName);
      }
    } else {
      storagePath = await this.saveToLocalDisk(file, storageName);
    }

    return this.prisma.fileUpload.create({
      data: {
        originalName: file.originalname,
        storageName,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        purpose,
        uploadedById,
      },
    });
  }

  private async saveToLocalDisk(
    file: Express.Multer.File,
    storageName: string,
  ): Promise<string> {
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    await mkdir(uploadDir, { recursive: true });

    const storagePath = join(uploadDir, storageName);
    await writeFile(storagePath, file.buffer);

    return `/${storagePath.replaceAll('\\', '/')}`;
  }
}
