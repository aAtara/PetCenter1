/**
 * Servidor Express para subir imágenes de mascotas.
 * Corre en el host (no en Docker), puerto 3001.
 *
 * Endpoints:
 *   POST /upload   → recibe archivo (campo "foto") y lo guarda en /uploads
 *                    Devuelve { url: "/uploads/pet_<timestamp>.ext" }
 *   GET  /uploads/<file> → sirve los archivos guardados
 */
const express = require('express');
const multer  = require('multer');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();
const PORT = 3001;
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Asegura que la carpeta de uploads exista
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('📁 Carpeta /uploads creada');
}

// CORS abierto para desarrollo (Angular dev server lo proxea, pero por si acaso)
app.use(cors());

// Sirve los archivos guardados de manera estática
app.use('/uploads', express.static(UPLOADS_DIR));

// Configuración de Multer: guarda con nombre único pet_<timestamp><ext>
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `pet_${Date.now()}${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Solo se aceptan archivos de imagen.'));
  }
});

// POST /upload
app.post('/upload', upload.single('foto'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo en el campo "foto".' });
  }
  const url = `/uploads/${req.file.filename}`;
  console.log(`📸 Imagen guardada: ${url}`);
  res.json({ url, filename: req.file.filename, size: req.file.size });
});

// Manejo de errores de Multer (archivo muy grande, etc.)
app.use((err, _req, res, _next) => {
  console.error('[server] error:', err.message);
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`📷 Servidor de imágenes corriendo en http://localhost:${PORT}`);
  console.log(`   POST /upload  → recibe archivos (campo "foto")`);
  console.log(`   GET  /uploads → sirve los archivos guardados`);
});
