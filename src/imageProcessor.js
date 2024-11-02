import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export class ImageProcessor {
  async processImage(imagePath) {
    const metadata = await sharp(imagePath).metadata();
    
    return {
      filename: path.basename(imagePath),
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      timestamp: new Date().toISOString()
    };
  }

  async saveMetadata(metadata) {
    const outputPath = `metadata-${Date.now()}.json`;
    await fs.writeFile(outputPath, JSON.stringify(metadata, null, 2));
    return outputPath;
  }
}