import { Router, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AuthenticatedRequest, authenticate } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists in apps/api/public/uploads
const uploadDir = path.resolve(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export const uploadRoutes = Router();

uploadRoutes.post(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { image, filename } = req.body;

      if (!image || typeof image !== 'string') {
        throw new ApiError(400, 'Image data (base64 string) is required');
      }

      // Match base64 data URI pattern
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

      let buffer: Buffer;
      let ext = 'jpg';

      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else if (mimeType.includes('gif')) ext = 'gif';
        else if (mimeType.includes('svg')) ext = 'svg';
        else ext = 'jpg';
      } else {
        // Plain base64 string
        buffer = Buffer.from(image, 'base64');
      }

      const randomName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
      const filePath = path.join(uploadDir, randomName);

      await fs.promises.writeFile(filePath, buffer);

      // Return public URL
      const host = req.get('host') || 'localhost:5000';
      const protocol = req.protocol || 'http';
      const fileUrl = `${protocol}://${host}/uploads/${randomName}`;

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: fileUrl,
          filename: randomName,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);
