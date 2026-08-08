import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "..", "..", "uploads", "avatars");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req: any, file, cb) => {
    const unique = `${req.user?.id ?? "user"}-${Date.now()}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
  if (ok) return cb(null, true);
  cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"));
};

export const avatarUpload = multer({ storage, fileFilter, limits: { fileSize: 3 * 1024 * 1024 } });