const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Thư mục cơ bản
const baseDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(baseDir); // Đảm bảo thư mục uploads tồn tại
app.use('/uploads', express.static(baseDir));
app.use(express.static(path.join(__dirname, 'public')));

// Hiển thị giao diện chính và duyệt thư mục
app.get('/', async (req, res) => {
    const currentDir = req.query.dir ? path.join(baseDir, req.query.dir) : baseDir;
    const items = await fs.readdir(currentDir, { withFileTypes: true });

    const files = items
        .filter(item => !item.isDirectory())
        .map(file => ({ name: file.name, type: 'file' }));
    const directories = items
        .filter(item => item.isDirectory())
        .map(dir => ({ name: dir.name, type: 'directory' }));

    // Chuyển đường dẫn thành breadcrumb
    const relativeDir = path.relative(baseDir, currentDir);
    const breadcrumb = relativeDir
        ? relativeDir.split(path.sep).map((dir, index, arr) => ({
              name: dir,
              path: arr.slice(0, index + 1).join('/')
          }))
        : [];

    res.render('index', { files, directories, currentDir: req.query.dir || '', breadcrumb });
});

// Tạo thư mục mới
app.post('/create-folder', async (req, res) => {
    const dirPath = path.join(baseDir, req.body.currentDir, req.body.folderName);
    await fs.ensureDir(dirPath);
    res.redirect('/?dir=' + req.body.currentDir);
});

// Tải lên file
const upload = multer({ dest: 'uploads/' });
app.post('/upload', upload.array('files'), async (req, res) => {
    const currentDir = req.body.currentDir || '';

    try {
        await Promise.all(
            req.files.map(file => {
                const targetPath = path.join(baseDir, currentDir, file.originalname);
                return fs.rename(file.path, targetPath);
            })
        );
        res.redirect('/?dir=' + currentDir);
    } catch (error) {
        console.error(error);
        res.status(500).send("Tải lên không thành công");
    }
});

// Xóa file hoặc thư mục
app.post('/delete', async (req, res) => {
    const targetPath = path.join(baseDir, req.body.currentDir, req.body.itemName);
    await fs.remove(targetPath);
    res.redirect('/?dir=' + req.body.currentDir);
});

// Đổi tên file hoặc thư mục
app.post('/rename', async (req, res) => {
    const currentDir = req.body.currentDir || '';
    const oldName = req.body.oldName;
    const newNameWithoutExt = req.body.newName; // Tên mới không có đuôi mở rộng

    const oldPath = path.join(baseDir, currentDir, oldName);
    const oldExt = path.extname(oldName); // Đuôi mở rộng của tên file cũ

    // Tạo tên mới với đuôi mở rộng cũ
    const newName = newNameWithoutExt + oldExt;
    const newPath = path.join(baseDir, currentDir, newName);

    try {
        await fs.rename(oldPath, newPath);
        res.redirect('/?dir=' + currentDir);
    } catch (error) {
        console.error(error);
        res.status(500).send("Đổi tên không thành công");
    }
});

// Điều hướng qua thư mục
app.get('/navigate', (req, res) => {
    const dir = req.query.dir;
    res.redirect('/?dir=' + dir);
});

app.post('/delete-selected', async (req, res) => {
    const currentDir = req.body.currentDir;
    const selectedItems = req.body.selectedItems; // Đây là mảng các mục đã chọn

    if (selectedItems && selectedItems.length > 0) {
        // Xóa từng mục trong danh sách selectedItems
        for (const item of selectedItems) {
            const itemPath = path.join(baseDir, currentDir, item);
            await fs.remove(itemPath);
        }
    }

    res.redirect('/?dir=' + currentDir);
});

// Khởi chạy server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
