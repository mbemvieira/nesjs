import * as colors from './colors.js';

export default class Canvas {
    #WIDTH = 32;
    #HEIGHT = 32;
    #SCALE = 10;

    #canvasEl;
    #ctx;

    #screenState;

    constructor(canvasId) {
        const canvasEl = document.getElementById(canvasId);

        if (canvasEl === null) {
            throw '[Canvas::class] Canvas element ID not found';
        }

        this.#canvasEl = canvasEl;
        this.#canvasEl.width = this.#WIDTH * this.#SCALE;
        this.#canvasEl.height = this.#HEIGHT * this.#SCALE;

        this.#ctx = canvasEl.getContext('2d');

        this.#screenState = [...Array(this.#WIDTH * this.#HEIGHT)].map(() => 0);
    }

    draw() {
        if (!this.#needUpdate()) {
            return;
        }

        this.#ctx.clearRect(0, 0, this.#WIDTH, this.#HEIGHT);

        let screenStateIdx = 0;

        for (let i = 0; i < this.#HEIGHT; i++) {
            for (let j = 0; j < this.#WIDTH; j++) {
                this.#ctx.fillStyle = this.#getColor(this.#screenState[screenStateIdx]);
                this.#ctx.fillRect(j * this.#SCALE, i * this.#SCALE, this.#SCALE, this.#SCALE);

                screenStateIdx += 1;
            }
        }

        requestAnimationFrame(() => this.draw.call(this));
    }

    copyToScreenState(pixelsArray) {
        if (!Array.isArray(pixelsArray)) {
            return;
        }

        const length = Math.min(this.#WIDTH * this.#HEIGHT, pixelsArray.length);

        for (let i = 0; i < length; i++) {
            this.#screenState[i] = pixelsArray[i];
        }
    }

    #getColor(byte) {
        return colors.byteToColorMap[byte] || colors.CYAN;
    }

    #needUpdate() {
        return true;
    }
}
