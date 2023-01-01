export default class Binary16 {
    #value;

    constructor(value = 0) {
        this.#value = new DataView(new ArrayBuffer(2));
        this.#value.setUint16(0, value);
    }

    get() {
        return this.#value.getUint16(0);
    }

    set(value) {
        this.#value.setUint16(0, value);
    }

    increment() {
        this.#value.setUint16(0, this.#value.getUint16(0) + 1);
    }

    decrement() {
        this.#value.setUint16(0, this.#value.getUint16(0) - 1);
    }
}
