import CPU from "./CPU.js";
import RAM from "./RAM.js";

export default class Console {
    RAM_SIZE = 0x2000;

    #cpu;
    #ram;

    constructor() {
        this.#ram = new RAM(this.RAM_SIZE);
        this.#cpu = new CPU();
    }

    start() {
        let program = new Uint8Array([
            0xA9, 0xC0,
            // 0xAA,
            // 0xE8,
            0x00
        ]);

        this.#cpu.interpret(program);
    }
}
