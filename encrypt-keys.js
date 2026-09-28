import CryptoJS from 'crypto-js';

const SECRET_PHRASE = 'CINEMATIX_SECURE_KEY_2026';

const omdb = 'a7d0a9ca';
const tmdb = '2cc076f8b37cd3cfe47c4f528f5e7fc0';

const encOmdb = CryptoJS.AES.encrypt(omdb, SECRET_PHRASE).toString();
const encTmdb = CryptoJS.AES.encrypt(tmdb, SECRET_PHRASE).toString();

console.log('ENCRYPTED_OMDB=', encOmdb);
console.log('ENCRYPTED_TMDB=', encTmdb);
