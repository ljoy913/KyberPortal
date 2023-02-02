import utils from './utils.js';
import kyber from '../output/kyber.js';

const sectionGenKeyAlice = document.getElementById('generateAlice');

sectionGenKeyAlice.initialize = (section) => {
    const aliceHandshake = utils.getNewHandshake('alice');
    sectionGenKeyAlice.fields[0].value = utils.toHex(aliceHandshake.publicKey);
    sectionGenKeyAlice.fields[1].value = utils.toHex(aliceHandshake.privateKey);
}

const sectionGenKeyBob = document.getElementById('generateBob');

sectionGenKeyBob.initialize = (section) => {
    const bobHandshake = utils.getNewHandshake('bob');
    sectionGenKeyBob.fields[0].value = utils.toHex(bobHandshake.publicKey);
    sectionGenKeyBob.fields[1].value = utils.toHex(bobHandshake.privateKey);
}

const sectionGenerateSecret = document.getElementById('generateSecret');

sectionGenerateSecret.fields[2].style.marginTop = '0.5em';

sectionGenerateSecret.initialize = (section) => {

    sectionGenerateSecret.clear();

    const bob = document.getElementById('generateBob');

    Promise.all([
        utils.randomHex(sectionGenerateSecret.fields[1], 64, 1000),
        utils.move(bob.fields[0].value, bob.fields[0], sectionGenerateSecret.fields[0], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } })
    ]).then(() => {
        const aliceCipherText = utils.handshakes['alice'].generateCipherTextAndSharedSecret(utils.handshakes['bob'].publicKey);
        sectionGenerateSecret.fields[1].value = utils.toHex(utils.handshakes['alice'].sharedSecret);
        sectionGenerateSecret.fields[0].value = bob.fields[0].value;
        setTimeout(() => {
            sectionGenerateSecret.fields[2].value = utils.toHex(aliceCipherText);
        }, 200);
    });

}


const sectionDecryptSecret = document.getElementById('decryptSecret');

sectionDecryptSecret.fields[2].style.marginTop = '1em';

sectionDecryptSecret.initialize = (section) => {

    sectionDecryptSecret.clear();

    const bob = document.getElementById('generateBob');
    const secret = sectionGenerateSecret;

    Promise.all([
        utils.move(bob.fields[1].value, bob.fields[1], sectionDecryptSecret.fields[0], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } }),
        utils.move(secret.fields[2].value, secret.fields[2], sectionDecryptSecret.fields[1], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } })
    ]).then(() => {
        const bobSharedSecret = utils.handshakes['bob'].generateRemoteSharedSecret(utils.handshakes['alice'].cipherText);
        sectionDecryptSecret.fields[0].value = secret.fields[2].value;
        sectionDecryptSecret.fields[1].value = bob.fields[1].value;
        setTimeout(() => {
            sectionDecryptSecret.fields[2].value = utils.toHex(bobSharedSecret);
            sectionDecryptSecret.fields[2].style.border = "2px solid #75FA61";
            sectionGenerateSecret.fields[1].style.border = "2px solid #75FA61";
        }, 200);
    });
}



const sectionDeriveKey = document.getElementById('deriveKey');

let cryptoKey;

sectionDeriveKey.initialize = (section) => {

    sectionDeriveKey.clear();

    Promise.all([
        utils.move(sectionGenerateSecret.fields[2].value, sectionGenerateSecret.fields[2], sectionDeriveKey.fields[0], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } })
    ]).then(() => {

        sectionDeriveKey.fields[0].value = sectionGenerateSecret.fields[2].value;

        const keyBytes = new Uint8Array(utils.handshakes['alice'].sharedSecret);

        window.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, true, ['encrypt', 'decrypt'])
            .then(key => {
                cryptoKey = key;
                return window.crypto.subtle.exportKey('raw', cryptoKey)
            })
            .then(rawKeyArrayBuffer => {
                sectionDeriveKey.fields[1].value = utils.toHex(new Uint8Array(rawKeyArrayBuffer));
            })
            .catch((err) => {
                alert(err);
            })

    });
}


const sectionEncryptText = document.getElementById('encryptText');
let iv;
let cipherBytes;

sectionEncryptText.fields[0].options.height.main.min = 400;
sectionEncryptText.fields[0].value = " ";

sectionEncryptText.initialize = (section) => {

    sectionEncryptText.fields[1].clear();
    sectionEncryptText.fields[2].clear();
    sectionEncryptText.fields[3].clear();

    Promise.all([
        //utils.move(plaintextAlice.fields[0].value, plaintextAlice.fields[0], sectionEncryptText.fields[0], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } }),
        utils.move(sectionDeriveKey.fields[1].value, sectionDeriveKey.fields[1], sectionEncryptText.fields[1], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } }),
        utils.randomHex(sectionEncryptText.fields[2], 12, 1000)
    ]).then(() => {
        const bobSharedSecret = utils.handshakes['bob'].generateRemoteSharedSecret(utils.handshakes['alice'].cipherText);
        //sectionEncryptText.fields[0].value = plaintextAlice.fields[0].value;
        sectionEncryptText.fields[1].value = sectionDeriveKey.fields[1].value;
        setTimeout(() => {
            iv = window.crypto.getRandomValues(new Uint8Array(12));
            window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, utils.textToBytes(sectionEncryptText.fields[0].value))
                .then(cipherArrayBuffer => {
                    cipherBytes = new Uint8Array(cipherArrayBuffer);
                    sectionEncryptText.fields[3].value = utils.toHex(new Uint8Array(cipherArrayBuffer));
                })
                .catch((err) => {
                    alert(err);
                })
        }, 200);
    });
}


const sectionDeriveKeyBob = document.getElementById('deriveKeyBob');

let cryptoKeyBob;

sectionDeriveKeyBob.initialize = (section) => {

    sectionDeriveKeyBob.clear();

    Promise.all([
        utils.move(sectionDecryptSecret.fields[2].value, sectionDecryptSecret.fields[2], sectionDeriveKeyBob.fields[0], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } })
    ]).then(() => {

        sectionDeriveKeyBob.fields[0].value = sectionGenerateSecret.fields[2].value;

        const keyBytes = new Uint8Array(utils.handshakes['alice'].sharedSecret);

        window.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, true, ['encrypt', 'decrypt'])
            .then(key => {
                cryptoKeyBob = key;
                return window.crypto.subtle.exportKey('raw', cryptoKeyBob)
            })
            .then(rawKeyArrayBuffer => {
                sectionDeriveKeyBob.fields[1].value = utils.toHex(new Uint8Array(rawKeyArrayBuffer));
            })
            .catch((err) => {
                alert(err);
            })

    });
}


const sectionDecryptCiphertext = document.getElementById('decryptCiphertext');

sectionDecryptCiphertext.initialize = (section) => {

    sectionDecryptCiphertext.clear();

    Promise.all([
        utils.move(sectionDeriveKeyBob.fields[1].value, sectionDeriveKeyBob.fields[1], sectionDecryptCiphertext.fields[0], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } }),
        utils.move(sectionEncryptText.fields[2].value, sectionEncryptText.fields[2], sectionDecryptCiphertext.fields[1], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } }),
        utils.move(sectionEncryptText.fields[3].value, sectionEncryptText.fields[3], sectionDecryptCiphertext.fields[2], "black", 1000, { from: { top: 20, left: 0 }, to: { top: 20, left: 0 } }),
    ]).then(() => {

        sectionDecryptCiphertext.fields[0].value = sectionDeriveKeyBob.fields[1].value;
        sectionDecryptCiphertext.fields[1].value = sectionEncryptText.fields[2].value;
        sectionDecryptCiphertext.fields[2].value = sectionEncryptText.fields[3].value;

        const keyBytes = new Uint8Array(utils.handshakes['alice'].sharedSecret);

        window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKeyBob, cipherBytes)
            .then(plainArrayBuffer => {
                sectionDecryptCiphertext.fields[3].value = utils.bytesToText(new Uint8Array(plainArrayBuffer));
            })
            .catch((err) => {
                alert(err);
            })

    });
}

