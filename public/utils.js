import kyber from '../output/kyber.js';

const handshakes = {};
const hexDigits = 0;

function getNewHandshake(name) {
    const handshake = new kyber.Kyber1024Handshake();

    const [bpk, bsk] = handshake.kyberService.generateKyberKeys();
    handshake.privateKey = bsk;
    handshake.publicKey = bpk;

    handshakes[name] = handshake;

    return handshake;
}

function toHex(bytes) {

    if (hexDigits === 0 || bytes.length <= hexDigits) return kyber.Buffer.from(bytes).toString('hex');

    return `${kyber.Buffer.from(bytes.slice(0, hexDigits)).toString('hex')} ... [${bytes.length} bytes]`;
}


function randomHex(field, length, duration) {

    return new Promise((resolve, reject) => {

        const intervalId = setInterval(() => {
            const array = Array(Math.ceil(length / 2)).fill(0);
            const bytes = array.map(() => Math.floor(Math.random() * 256));
            const randomHex = toHex(bytes);
            field.value = randomHex;
        }, 50);

        setTimeout(() => {
            clearInterval(intervalId);
            resolve();
        }, duration);

    });
}

function textToBytes(text) {
    const buffer = kyber.Buffer.from(text, 'utf-8');
    return new Uint8Array(buffer);
}


function bytesToText(bytes) {
    return kyber.Buffer.from(bytes).toString('utf-8');
}


function move(text, fromElement, toElement, color, duration, offset = { from: { top: 0, left: 0 }, to: { top: 0, left: 0 } }) {

    return new Promise((resolve, reject) => {

        const rectFrom = fromElement.getBoundingClientRect();
        const rectTo = toElement.getBoundingClientRect();

        const label = document.createElement("LABEL");
        label.innerText = text;
        label.style.color = color;
        label.style.position = "absolute";
        label.style.animationTimingFunction = "ease"
        // label.style.background = "#FFFFFF";
        // label.style.border = "1px solid black";
        // label.style.display = "inline-block";
        // label.style.margin = "0.5em";
        // label.style.borderRadius = "3px";

        const body = document.body;
        body.style.position = "relative";


        body.appendChild(label);


        const moveKeyframes = [
            { top: rectFrom.y + offset.from.top + 'px', left: rectFrom.x + offset.from.left + 'px', offset: 0.0 },
            { top: rectTo.y + offset.to.top + 'px', left: rectTo.x + offset.to.left + 'px', offset:1.0 }
        ];

        const options = {
            duration: duration,
            iterations: 1
        }

        label.animate(moveKeyframes, options).finished.then(() => {
            body.removeChild(label);
            setTimeout(resolve, 0);
        });

    })

}


export default {
    getNewHandshake,
    handshakes,
    toHex,
    randomHex,
    move,
    textToBytes,
    bytesToText
}