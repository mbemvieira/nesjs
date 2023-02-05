export default class Binary8 {
    #value;

    constructor(value = 0) {
        this.#value = new DataView(new ArrayBuffer(1));
        this.#value.setUint8(0, value);
    }

    get() {
        return this.#value.getUint8(0);
    }

    set(value) {
        this.#value.setUint8(0, value);
    }

    increment() {
        this.#value.setUint8(0, this.#value.getUint8(0) + 1);
    }

    decrement() {
        this.#value.setUint8(0, this.#value.getUint8(0) - 1);
    }
}
