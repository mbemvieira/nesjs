import CPU from "./CPU.js";
import Memory from "./Memory.js";

export default class Console {
    MEMORY_SIZE = 0x1_0000;

    #cpu;
    #memory;
    #program;

    constructor(program) {
        this.#memory = new Memory(this.MEMORY_SIZE);
        this.#cpu = new CPU(this.#memory);
        this.#program = program;

        this.#memory.copy(this.#program, 0x8000);
        this.#memory.writeWord(0xFFFC, 0x8000);

        this.#cpu.reset();
    }

    start() {
        this.#cpu.run();
    }

    getCPU() {
        return this.#cpu;
    }

    getMemory() {
        return this.#memory;
    }
}
