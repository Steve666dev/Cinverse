import CryptoJS from 'crypto-js';

const SECRET_PHRASE = 'CINEMATIX_SECURE_KEY_2026';

const omdb = 'API';
const tmdb = 'API';

const encOmdb = CryptoJS.AES.encrypt(omdb, SECRET_PHRASE).toString();
const encTmdb = CryptoJS.AES.encrypt(tmdb, SECRET_PHRASE).toString();

console.log('ENCRYPTED_OMDB=', encOmdb);
console.log('ENCRYPTED_TMDB=', encTmdb);
