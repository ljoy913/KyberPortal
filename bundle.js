import { Kyber1024Handshake } from 'crystals-kyber-ts';

/**
* Generate 2 key agreements, one for Bob and one for Alice
*/
const bobHandshake = new Kyber1024Handshake();
const aliceHandshake = new Kyber1024Handshake();
/**
* Send Bob's public key to Alice and generate the Cipher Text and Shared Secret
*/
const bobPublicKey = bobHandshake.publicKey;
const aliceCipherText = aliceHandshake.generateCipherTextAndSharedSecret(bobPublicKey);
aliceHandshake.generateRemoteSharedSecret(aliceCipherText);
/**
* Send the cipher text generated from Bob's public key to Bob so that he
* can generate the same remote shared secret
*/
const bobSharedSecret = bobHandshake.generateRemoteSharedSecret(aliceCipherText);
console.log(bobSharedSecret);
