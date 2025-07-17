import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';

interface UploadedMedia {
  url: string;
  type: string;
  width?: number;
  height?: number;
}

export class MediaService {
  private static readonly UPLOAD_DIR = config.media.storagePath;
  private static readonly MAX_FILE_SIZE = config.media.maxFileSize;
  private static readonly ALLOWED_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ]);

  private static readonly IMAGE_SIZES = {
    thumbnail: { width: 150, height: 150 },
    medium: { width: 600, height: 600 },
    large: { width: 1200, height: 1200 },
  };

  static async initialize(): Promise<void> {
    // Ensure upload directories exist
    await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    await fs.mkdir(join(this.UPLOAD_DIR, 'images'), { recursive: true });
    await fs.mkdir(join(this.UPLOAD_DIR, 'videos'), { recursive: true });
  }

  static async uploadMedia(
    file: Express.Multer.File,
    userId: number
  ): Promise<UploadedMedia> {
    // Validate file
    if (!file.mimetype || !this.ALLOWED_TYPES.has(file.mimetype)) {
      throw new Error('Unsupported file type');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('File too large');
    }

    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const fileId = uuidv4();
    const extension = file.originalname.split('.').pop();
    const fileName = `${fileId}.${extension}`;

    if (isImage) {
      return this.processAndSaveImage(file, fileName, userId);
    } else if (isVideo) {
      return this.processAndSaveVideo(file, fileName, userId);
    }

    throw new Error('Unsupported media type');
  }

  private static async processAndSaveImage(
    file: Express.Multer.File,
    fileName: string,
    userId: number
  ): Promise<UploadedMedia> {
    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    // Create directories for user if they don't exist
    const userDir = join(this.UPLOAD_DIR, 'images', userId.toString());
    await fs.mkdir(userDir, { recursive: true });

    // Generate different sizes
    const sizes = await Promise.all(
      Object.entries(this.IMAGE_SIZES).map(async ([size, dimensions]) => {
        const resizedFileName = `${size}_${fileName}`;
        const resizedPath = join(userDir, resizedFileName);

        await image
          .resize(dimensions.width, dimensions.height, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toFile(resizedPath);

        return {
          size,
          path: `/media/images/${userId}/${resizedFileName}`,
        };
      })
    );

    // Save original
    const originalPath = join(userDir, fileName);
    await fs.writeFile(originalPath, file.buffer);

    return {
      url: `/media/images/${userId}/${fileName}`,
      type: file.mimetype,
      width: metadata.width,
      height: metadata.height,
      sizes: sizes.reduce((acc, { size, path }) => ({
        ...acc,
        [size]: path,
      }), {}),
    };
  }

  private static async processAndSaveVideo(
    file: Express.Multer.File,
    fileName: string,
    userId: number
  ): Promise<UploadedMedia> {
    // Create directories for user if they don't exist
    const userDir = join(this.UPLOAD_DIR, 'videos', userId.toString());
    await fs.mkdir(userDir, { recursive: true });

    // Save video
    const videoPath = join(userDir, fileName);
    await fs.writeFile(videoPath, file.buffer);

    // In a production environment, you might want to:
    // 1. Generate different video qualities
    // 2. Create video thumbnail
    // 3. Extract video metadata
    // 4. Process video for streaming

    return {
      url: `/media/videos/${userId}/${fileName}`,
      type: file.mimetype,
    };
  }

  static async deleteMedia(url: string): Promise<void> {
    const filePath = join(this.UPLOAD_DIR, url.replace('/media/', ''));
    await fs.unlink(filePath);
  }
}
