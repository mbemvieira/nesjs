import Opcode from "./Opcode.js";
import AddressingMode from "./AddressingMode.js";

export default class CPU {
    PC_FIRST_ADDRESS = 0xFFFC;

    #memory;

    // N V _ B - D I Z C
    #status;

    #registerA;
    #registerX;

    #programCounter;
    #instructionSet;

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

        let programCounterStart = this.#memory.readWord(this.PC_FIRST_ADDRESS);

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

            if (!this.#instructionSet.has(opcode)) {
                break;
            }

            const opcodeFunc = this.#instructionSet.get(opcode);
            opcodeFunc();
        }
    }

    #initOpcodes() {
        this.#instructionSet = new Map();

        // this.#instructionSet.set(0xA9, this.#instructionLDA.bind(this));
        // this.#instructionSet.set(0xAA, this.#instructionTAX.bind(this));
        // this.#instructionSet.set(0xE8, this.#instructionINX.bind(this));
        // this.#instructionSet.set(0x00, this.#instructionBRK.bind(this));

        this.#instructionSet.set(0x00, new Opcode(0x00, 'BRK', 1, 7, AddressingMode.none));
        this.#instructionSet.set(0xAA, new Opcode(0xAA, 'TAX', 1, 2, AddressingMode.none));
        this.#instructionSet.set(0xE8, new Opcode(0xE8, 'INX', 1, 2, AddressingMode.none));

        this.#instructionSet.set(0xA9, new Opcode(0xA9, 'LDA', 2, 2, AddressingMode.immediate));
        this.#instructionSet.set(0xA5, new Opcode(0xA5, 'LDA', 2, 3, AddressingMode.zeroPage));
        this.#instructionSet.set(0xB5, new Opcode(0xB5, 'LDA', 2, 4, AddressingMode.zeroPageX));
        this.#instructionSet.set(0xAD, new Opcode(0xAD, 'LDA', 3, 4, AddressingMode.absolute));
        this.#instructionSet.set(0xBD, new Opcode(0xBD, 'LDA', 3, 4/*+1 if page crossed*/, AddressingMode.absoluteX));
        this.#instructionSet.set(0xB9, new Opcode(0xB9, 'LDA', 3, 4/*+1 if page crossed*/, AddressingMode.absoluteY));
        this.#instructionSet.set(0xA1, new Opcode(0xA1, 'LDA', 2, 6, AddressingMode.indirectX));
        this.#instructionSet.set(0xB1, new Opcode(0xB1, 'LDA', 2, 5/*+1 if page crossed*/, AddressingMode.indirectY));

        this.#instructionSet.set(0x85, new Opcode(0x85, 'STA', 2, 3, AddressingMode.zeroPage));
        this.#instructionSet.set(0x95, new Opcode(0x95, 'STA', 2, 4, AddressingMode.zeroPageX));
        this.#instructionSet.set(0x8D, new Opcode(0x8D, 'STA', 3, 4, AddressingMode.absolute));
        this.#instructionSet.set(0x9D, new Opcode(0x9D, 'STA', 3, 5, AddressingMode.absoluteX));
        this.#instructionSet.set(0x99, new Opcode(0x99, 'STA', 3, 5, AddressingMode.absoluteY));
        this.#instructionSet.set(0x81, new Opcode(0x85, 'STA', 2, 6, AddressingMode.indirectX));
        this.#instructionSet.set(0x91, new Opcode(0x85, 'STA', 2, 6, AddressingMode.indirectY));
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

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
    }

    #instructionINX() {
        this.setRegisterX(this.getRegisterX() + 1);

        this.#checkZeroFlag(this.getRegisterX);
        this.#checkNegativeFlag(this.getRegisterX);
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
