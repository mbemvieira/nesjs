import CPU from "./CPU.js";
import Memory from "./Memory.js";

export default class Console {
    MEMORY_SIZE = 0x1_0000;
    // pure 6502 starts at 0x0600
    PC_START = 0x8000;

    #cpu;
    #memory;
    #program;

    constructor(program) {
        this.#memory = new Memory(this.MEMORY_SIZE);
        this.#cpu = new CPU(this.#memory);
        this.#program = program;

        this.#memory.copy(this.#program, this.PC_START);
        this.#memory.writeWord(this.#cpu.PC_RESET, this.PC_START);

        this.#cpu.reset();
    }

    start(callback = null) {
        this.#cpu.run(() => callback !== null && callback.call());
    }

    getCPU() {
        return this.#cpu;
    }

    getMemory() {
        return this.#memory;
    }
}
