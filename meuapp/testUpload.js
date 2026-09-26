const fs = require('fs');
const path = require('path');
// Using native fetch (Node >=18) which provides FormData and Blob.

const CLOUD_NAME = 'com07vbi';
const UPLOAD_PRESET = 'Fotos Itens';

// Determine MIME type from file extension
const getMimeType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
  };
  return map[ext] || 'application/octet-stream';
};

const uploadImage = async (filePath) => {
  console.log('UPLOAD START');
  console.log('FILE:', filePath);
  const fileName = path.basename(filePath);
  const mime = getMimeType(filePath);
  console.log('MIME TYPE:', mime);
  console.log('UPLOAD PRESET:', UPLOAD_PRESET);

  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: mime });

  const data = new FormData();
  // The third argument sets the filename in multipart payload
  data.append('file', blob, fileName);
  data.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: data,
  });
  console.log('CLOUDINARY STATUS:', response.status);
  const result = await response.json();
  console.log('CLOUDINARY RESPONSE:', JSON.stringify(result));

  if (response.ok && result.secure_url) {
    console.log('UPLOAD SUCCESS');
    console.log('secure_url:', result.secure_url);
    console.log('public_id:', result.public_id);
    return result.secure_url;
  }

  // If not ok, show detailed error info
  console.error('UPLOAD FAILED');
  if (result.error?.message) {
    console.error('ERROR MESSAGE:', result.error.message);
  }
  throw new Error(`Upload failed with status ${response.status}`);
};

// Entry point: expects a local image path as first argument
const [, , imagePath] = process.argv;
if (!imagePath) {
  console.error('Uso: node testUpload.js <caminho-para-imagem>');
  process.exit(1);
}

(async () => {
  try {
    const url = await uploadImage(imagePath);
    console.log('RESULT URL:', url);
  } catch (e) {
    console.error('ERROR', e.message);
  }
})();
