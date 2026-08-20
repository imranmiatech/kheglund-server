import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type UploadPurpose =
  'AVATAR' | 'RESOURCE' | 'ARTICLE_COVER' | 'ANNOUNCEMENT_COVER' | 'OTHER';

@Injectable()
export class UploadsService {
  constructor(private readonly prisma: PrismaService) {}

  async saveFile(
    file: Express.Multer.File,
    purpose: UploadPurpose,
    uploadedById?: string,
  ) {
    const uploadDir = process.env.UPLOAD_DIR ?? 'uploads';
    await mkdir(uploadDir, { recursive: true });

    const extension = extname(file.originalname) || '';
    const storageName = `${randomUUID()}${extension}`;
    const storagePath = join(uploadDir, storageName);

    await writeFile(storagePath, file.buffer);

    return this.prisma.fileUpload.create({
      data: {
        originalName: file.originalname,
        storageName,
        storagePath: `/${storagePath.replaceAll('\\', '/')}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        purpose,
        uploadedById,
      },
    });
  }
}
