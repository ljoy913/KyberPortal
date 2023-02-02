import { Kyber1024Handshake, Kyber512Handshake, Kyber768Handshake } from "crystals-kyber-ts";
import { Buffer } from "buffer";
// /**
// * Generate 2 key agreements, one for Bob and one for Alice
// */
// const bobHandshake = new Kyber1024Handshake();
// const aliceHandshake = new Kyber1024Handshake();
// const [bpk,bsk] = bobHandshake.kyberService.generateKyberKeys();
// bobHandshake.privateKey = bsk;
// bobHandshake.publicKey = bpk;
// const [apk,ask] = aliceHandshake.kyberService.generateKyberKeys();
// aliceHandshake.privateKey = ask;
// aliceHandshake.publicKey = apk;
// /**
// * Send Bob's public key to Alice and generate the Cipher Text and Shared Secret
// */
// const bobPublicKey: number[] = bobHandshake.publicKey;
// const aliceCipherText: number[] = aliceHandshake.generateCipherTextAndSharedSecret(bobPublicKey);
// const aliceSharedSecret = aliceHandshake.generateRemoteSharedSecret(aliceCipherText);
// /**
// * Send the cipher text generated from Bob's public key to Bob so that he
// * can generate the same remote shared secret
// */
// const bobSharedSecret: number[] = bobHandshake.generateRemoteSharedSecret(aliceCipherText);
// console.log(bobSharedSecret);
export default {
    Kyber1024Handshake, Kyber512Handshake, Kyber768Handshake, Buffer
};
//# sourceMappingURL=index.js.map