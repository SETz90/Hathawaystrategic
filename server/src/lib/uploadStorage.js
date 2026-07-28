/* =========================================================
   LOCAL DISK UPLOAD STORAGE (dev-phase implementation)
   Files are written to server/uploads/ and only metadata is
   stored in Postgres via the File model. Swap this module out
   for an S3/R2/Cloudinary-backed storage adapter later — nothing
   outside files.controller.js should need to change since it
   only touches UPLOAD_DIR + uploadSingle.
   ========================================================= */

import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// server/src/lib -> server/uploads
export const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — dev-friendly local storage cap

// Whitelist of mime types accepted while files live on local disk.
// Revisit this alongside limits once storage moves to a cloud provider.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "text/csv",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Store under a random name so the on-disk filename never leaks the
    // original name or lets someone guess/collide another upload's path.
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("UNSUPPORTED_FILE_TYPE"));
    }
    cb(null, true);
  },
});

/**
 * Express middleware wrapping multer's single-file upload so failures
 * (oversized file, disallowed type) come back as clean JSON instead of
 * multer's default error shape.
 */
export function uploadSingle(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File exceeds the 25MB limit",
      });
    }
    if (err.message === "UNSUPPORTED_FILE_TYPE") {
      return res.status(415).json({
        success: false,
        message: "That file type isn't supported",
      });
    }
    next(err);
  });
}
