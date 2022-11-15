export default class CPU {
    // #cpuRAM;
    #prgROM;

    // N V _ B - D I Z C
    #status;

    #registerA;
    #registerX;

    #programCounter;
    #opcodes;

    constructor() {
        // this.#cpuRAM = ram;
        this.#registerA = new Uint8Array(1);
        this.#registerX = new Uint8Array(1);
        this.#status = new Uint8Array(1);
        this.#programCounter = new Uint16Array(1);

        this.#initOpcodes();
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

    interpret(program) {
        this.#prgROM = program;
        this.#programCounter[0] = 0;

        while(1) {
            const opcode = this.#prgROM[this.#programCounter[0]];

            this.#programCounter[0] += 1;

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
        const value = this.#prgROM[this.#programCounter[0]];
        
        this.#programCounter[0] += 1;
        this.#registerA[0] = value;

        this.#checkZeroFlag(this.#registerA[0]);
        this.#checkNegativeFlag(this.#registerA[0]);
    }

    #instructionTAX() {
        this.#registerX[0] = this.#registerA[0];

        this.#checkZeroFlag(this.#registerX[0]);
        this.#checkNegativeFlag(this.#registerX[0]);
    }

    #instructionINX() {
        this.#registerX[0] += 1;

        this.#checkZeroFlag(this.#registerX[0]);
        this.#checkNegativeFlag(this.#registerX[0]);
    }

    #instructionBRK() {
        return;
    }

    #checkZeroFlag(value) {
        if (value == 0) {
            // equal to zero
            this.#status[0] = this.#status[0] | 0b0000_0010;
        } else {
            // not equal to zero
            this.#status[0] = this.#status[0] & 0b1111_1101;
        }
    }

    #checkNegativeFlag(value) {
        if ((value & 0b1000_0000) == 0) {
            // Positive
            this.#status[0] = this.#status[0] & 0b0111_1111;
        } else {
            // Negative
            this.#status[0] = this.#status[0] | 0b1000_0000;
        }
    }
}
