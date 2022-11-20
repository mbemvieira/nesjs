export default class CPU {
    #memory;

    // N V _ B - D I Z C
    #status;

    #registerA;
    #registerX;

    #programCounter;
    #opcodes;

    constructor(memory) {
        this.#memory = memory;
        this.#status = new Uint8Array(1);
        this.#registerA = new Uint8Array(1);
        this.#registerX = new Uint8Array(1);
        this.#programCounter = new Uint16Array(1);

        this.#initOpcodes();
    }

    reset() {
        this.setRegisterA(0);
        this.setRegisterX(0);
        this.setStatus(0);

        let programCounterStart = this.#memory.readWord(0xFFFC);

        if (programCounterStart === null) {
            programCounterStart = 0x0000;
        }

        this.setProgramCounter(programCounterStart);
    }

    getStatus() {
        return this.#status[0];
    }

    getRegisterA() {
        return this.#registerA[0];
    }

    getRegisterX() {
        return this.#registerX[0];
    }

    getProgramCounter() {
        return this.#programCounter[0];
    }

    setStatus(value) {
        this.#status[0] = value;
    }

    setNegativeFlag() {
        this.setStatus(this.getStatus() | 0b1000_0000);
    }

    unsetNegativeFlag() {
        this.setStatus(this.getStatus() & 0b0111_1111);
    }

    setZeroFlag() {
        this.setStatus(this.getStatus() | 0b0000_0010);
    }

    unsetZeroFlag() {
        this.setStatus(this.getStatus() & 0b1111_1101);
    }

    setRegisterA(value) {
        return this.#registerA[0] = value;
    }

    setRegisterX(value) {
        return this.#registerX[0] = value;
    }

    setProgramCounter(value) {
        this.#programCounter[0] = value;
    }

    setProgramCounter(value) {
        this.#programCounter[0] = value;
    }

    incProgramCounter() {
        this.#programCounter[0] += 1;
    }

    run() {
        while(1) {
            const opcode = this.#memory[this.getProgramCounter()];

            this.incProgramCounter();

            if (!this.#opcodes.has(opcode)) {
                break;
            }

            const opcodeFunc = this.#opcodes.get(opcode);
            opcodeFunc();
        }
    }

    #initOpcodes() {
        this.#opcodes = new Map();

        this.#opcodes.set(0xA9, this.#instructionLDA.bind(this));
        this.#opcodes.set(0xAA, this.#instructionTAX.bind(this));
        this.#opcodes.set(0xE8, this.#instructionINX.bind(this));
        this.#opcodes.set(0x00, this.#instructionBRK.bind(this));
    }

    #instructionLDA() {
        const value = this.#memory[this.getProgramCounter()];

        this.incProgramCounter();

        this.setRegisterA(value);

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionTAX() {
        this.setRegisterX(this.getRegisterA());

        this.#checkZeroFlag(this.#registerX[0]);
        this.#checkNegativeFlag(this.#registerX[0]);
    }

    #instructionINX() {
        this.setRegisterX(this.getRegisterX() + 1);

        this.#checkZeroFlag(this.#registerX[0]);
        this.#checkNegativeFlag(this.#registerX[0]);
    }

    #instructionBRK() {
        return;
    }

    #checkZeroFlag(value) {
        if (value == 0) {
            this.setZeroFlag();
        } else {
            this.unsetZeroFlag();
        }
    }

    #checkNegativeFlag(value) {
        // Check sign bit. if 1 then negative else positive
        if ((value & 0b1000_0000) == 0) {
            this.unsetNegativeFlag();
        } else {
            this.setNegativeFlag();
        }
    }
}
