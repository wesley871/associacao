import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if(!fs.existsSync(path.resolve("uploads"))){
            fs.mkdirSync(path.resolve("uploads"));
        }
        const uploadDir = path.resolve("uploads/");

        cb(null, uploadDir)
    }, 
    filename: (req, file, cb) => {
        const filename = Date.now() + '-' + file.originalname
        cb(null, filename)
    }
});

export default multer({ storage });