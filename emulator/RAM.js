export default class RAM {
    #memory;

    constructor(size) {
        this.#memory = new Uint8Array(size);
    }
}
