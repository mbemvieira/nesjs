import CPU from "./CPU.js";
import Memory from "./Memory.js";

export default class Console {
    MEMORY_SIZE = 0x1_0000;

    #cpu;
    #memory;

    constructor() {
        this.#memory = new Memory(this.MEMORY_SIZE);
        this.#cpu = new CPU(this.#memory);
    }

    start() {
        let program = new Uint8Array([
            0xA9, 0xC0,
            // 0xAA,
            // 0xE8,
            0x00
        ]);

        this.#memory.copy(program, 0x8000);
        this.#memory.writeWord(0xFFFC, 0x8000);

        this.#cpu.reset();
        this.#cpu.run();
    }
}
