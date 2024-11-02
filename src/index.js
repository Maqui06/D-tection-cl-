import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ImageProcessor } from './imageProcessor.js';
import { KeyRecognition } from './keyRecognition.js';
import { PDFGenerator } from './pdfGenerator.js';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Create required directories
import fs from 'fs/promises';
try {
  await fs.mkdir(path.join(__dirname, '../uploads'), { recursive: true });
  await fs.mkdir(path.join(__dirname, '../public'), { recursive: true });
  await fs.mkdir(path.join(__dirname, '../templates'), { recursive: true });
} catch (err) {
  console.error('Error creating directories:', err);
}

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });
const processor = new ImageProcessor();
const keyRecognition = new KeyRecognition();
const pdfGenerator = new PDFGenerator();

await db.connect();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/keys', async (req, res) => {
  try {
    const keys = await db.getAllKeys();
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: 'Error retrieving keys' });
  }
});

app.post('/api/keys', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const metadata = await processor.processImage(req.file.path);
    const { name } = req.body;

    const keyData = await keyRecognition.preprocessImage(req.file.path);
    const { descriptors } = keyRecognition.detectKeypoints(keyData);

    await db.addKey(name, descriptors.data, metadata, req.file.path);
    res.json({ message: 'Key added successfully', metadata });
  } catch (error) {
    res.status(500).json({ error: 'Error adding key' });
  }
});

app.post('/api/recognize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const keys = await db.getAllKeys();
    const matches = [];

    for (const key of keys) {
      const result = await keyRecognition.compareKeys(
        req.file.path,
        key.descriptors
      );

      if (result.isMatch) {
        matches.push({
          key,
          score: result.score
        });
      }
    }

    res.json({
      matches: matches.sort((a, b) => a.score - b.score)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error recognizing key' });
  }
});

app.post('/api/generate-pdf/:id', async (req, res) => {
  try {
    const key = await db.getKeyById(req.params.id);
    if (!key) {
      return res.status(404).json({ error: 'Key not found' });
    }

    const outputPath = path.join(__dirname, `../templates/key-${key.id}-template.pdf`);
    await pdfGenerator.generateTemplate(key, outputPath);
    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: 'Error generating PDF' });
  }
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});