import * as colors from './colors.js';

export default class Canvas {
    #WIDTH = 32;
    #HEIGHT = 32;
    #SCALE = 10;

    #canvasEl;
    #ctx;

    #screenState;
    #screenStateBuffer;

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
        this.#screenStateBuffer = [...Array(this.#WIDTH * this.#HEIGHT)].map(() => 0);
    }

    start() {
        this.#draw();
        this.#loop();
    }

    setScreenState(pixelsArray) {
        if (!Array.isArray(pixelsArray)) {
            return;
        }

        for (let i = 0; i < this.#screenStateBuffer.length; i++) {
            if (i < pixelsArray.length) {
                this.#screenStateBuffer[i] = pixelsArray[i];
            } else {
                this.#screenStateBuffer[i] = 0;
            }
        }
    }

    #loop() {
        const loop = () => this.#loop.call(this);

        if (!this.#needsUpdate()) {
            requestAnimationFrame(loop);
            return;
        }

        this.#moveFromBuffer();
        this.#draw();

        requestAnimationFrame(loop);
    }

    #draw() {
        this.#ctx.clearRect(0, 0, this.#WIDTH, this.#HEIGHT);

        let screenStateIdx = 0;

        for (let i = 0; i < this.#HEIGHT; i++) {
            for (let j = 0; j < this.#WIDTH; j++) {
                this.#ctx.fillStyle = this.#getColor(this.#screenState[screenStateIdx]);
                this.#ctx.fillRect(j * this.#SCALE, i * this.#SCALE, this.#SCALE, this.#SCALE);

                screenStateIdx += 1;
            }
        }
    }

    #getColor(byte) {
        return colors.byteToColorMap[byte] || colors.CYAN;
    }

    #needsUpdate() {
        for (let i = 0; i < this.#screenState.length; i++) {
            if (this.#screenState[i] !== this.#screenStateBuffer[i]) {
                return true;
            }
        }

        return false;
    }

    #moveFromBuffer() {
        this.#screenState = this.#screenStateBuffer.map((el) => el);
    }
}
