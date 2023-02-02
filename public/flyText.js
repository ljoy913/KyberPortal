
function move(text, fromElement, toElement, color, offset = { from: { top: 0, left: 0 }, to: { top: 0, left: 0 } }) {

    return new Promise((resolve, reject) => {

        const rectFrom = fromElement.getBoundingClientRect();
        const rectTo = toElement.getBoundingClientRect();

        const label = document.createElement("LABEL");
        label.innerText = text;
        label.style.color = color;
        label.style.position = "absolute";
        label.style.animationTimingFunction = "ease"
        label.style.background = "#FFFFFF";
        label.style.border = "1px solid black";
        label.style.display = "inline-block";
        label.style.margin = "0.5em";
        label.style.borderRadius = "3px";

        const body = document.body;
        body.style.position = "relative";


        body.appendChild(label);


        const moveKeyframes = [
            { top: rectFrom.y + offset.from.top + 'px', left: rectFrom.x + offset.from.left + 'px', offset: 0.0 },
            { top: rectTo.y + offset.to.top + 'px', left: rectTo.x + offset.to.left + 'px', offset:1.0 }
        ];

        const options = {
            duration: 1000,
            iterations: 1
        }

        label.animate(moveKeyframes, options).finished.then(() => {
            body.removeChild(label);
            setTimeout(resolve, 0);
        });

    })

}

export default {
    move
}