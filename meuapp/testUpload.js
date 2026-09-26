import fetch from 'node-fetch';
global.fetch = fetch;

const CLOUD_NAME = 'com07vbi';
const UPLOAD_PRESET = 'Fotos Itens';
const UPLOAD_PRESETS = [UPLOAD_PRESET];

const uploadImage = async (uri, fileName) => {
  console.log('UPLOAD START');
  console.log('IMAGE URI:', uri);
  console.log('FILE NAME:', fileName);
  let lastPresetError = '';
  const getMimeType = (u) => {
    const ext = u.split('.').pop()?.toLowerCase();
    const map = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif', heic:'image/heic' };
    return map[ext] || 'application/octet-stream';
  };
  const mime = getMimeType(uri);
  console.log('MIME TYPE:', mime);
  for (const preset of UPLOAD_PRESETS) {
    console.log('TRYING PRESET:', preset);
    const data = new FormData();
    data.append('file', { uri, name: fileName, type: mime });
    data.append('upload_preset', preset);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method:'POST', body:data });
    console.log('CLOUDINARY STATUS:', response.status);
    const result = await response.json();
    console.log('CLOUDINARY RESPONSE:', JSON.stringify(result));
    if (response.ok && result.secure_url) {
      console.log('UPLOAD SUCCESS, URL:', result.secure_url);
      return result.secure_url;
    }
    const cloudinaryMessage = result.error?.message || '';
    const isPresetError = /upload[_ ]preset|preset/i.test(cloudinaryMessage);
    if (!isPresetError) {
      console.error('CLOUDINARY ERROR (non-preset):', cloudinaryMessage);
      throw new Error(cloudinaryMessage || `Cloudinary rejeitou o upload (${response.status}).`);
    }
    console.warn('PRESET REJECTED:', cloudinaryMessage);
    lastPresetError = cloudinaryMessage;
  }
  throw new Error(`Nenhum preset válido foi encontrado no Cloudinary. Última resposta: ${lastPresetError || 'erro 400'}.`);
};

(async()=>{ try{ const url = await uploadImage('https://via.placeholder.com/150','test.jpg'); console.log('RESULT URL',url);}catch(e){ console.error('ERROR',e.message);} })();
