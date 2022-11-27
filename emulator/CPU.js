import Opcode from "./Opcode.js";
import AddressingMode from "./AddressingMode.js";

export default class CPU {
    PC_FIRST_ADDRESS = 0xFFFC;

    #memory;

    //  7 6 5 4 3 2 1 0
    //  N V _ B D I Z C
    //  | |   | | | | +--- Carry Flag
    //  | |   | | | +----- Zero Flag
    //  | |   | | +------- Interrupt Disable
    //  | |   | +--------- Decimal Mode (not used on NES)
    //  | |   +----------- Break Command
    //  | +--------------- Overflow Flag
    //  +----------------- Negative Flag
    //
    #status;

    #registerA;
    #registerX;
    #registerY;

    #programCounter;
    #instructionSet;

    constructor(memory) {
        this.#memory = memory;
        this.#status = new DataView(new ArrayBuffer(1));
        this.#registerA = new DataView(new ArrayBuffer(1));
        this.#registerX = new DataView(new ArrayBuffer(1));
        this.#registerY = new DataView(new ArrayBuffer(1));
        this.#programCounter = new DataView(new ArrayBuffer(2));

        this.#initOpcodes();
    }

    reset() {
        this.setRegisterA(0);
        this.setRegisterX(0);
        this.setRegisterY(0);
        this.setStatus(0);

        let programCounterStart = this.#memory.readWord(this.PC_FIRST_ADDRESS);

        if (programCounterStart === null) {
            programCounterStart = 0x0000;
        }

        this.setProgramCounter(programCounterStart);
    }

    getStatus() {
        return this.#status.getUint8();
    }

    getRegisterA() {
        return this.#registerA.getUint8();
    }

    getRegisterX() {
        return this.#registerX.getUint8();
    }

    getRegisterY() {
        return this.#registerY.getUint8();
    }

    getProgramCounter() {
        return this.#programCounter.getUint16();
    }

    setStatus(value) {
        this.#status.setUint8(0, value);
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
        return this.#registerA.setUint8(0, value);
    }

    setRegisterX(value) {
        return this.#registerX.setUint8(0, value);
    }

    setRegisterY(value) {
        return this.#registerY.setUint8(0, value);
    }

    setProgramCounter(value) {
        this.#programCounter.setUint16(0, value);
    }

    incProgramCounter() {
        this.#programCounter.setUint16(0, this.getProgramCounter() + 1);
    }

    run() {
        while(1) {
            const opcode = this.#memory.read(this.getProgramCounter());

            this.incProgramCounter();

            let programCounterState = this.getProgramCounter();

            if (opcode === 0x00 || !this.#instructionSet.has(opcode)) {
                break;
            }

            const instruction = this.#instructionSet.get(opcode);

            instruction.execute();

            if (programCounterState === this.getProgramCounter()) {
                this.setProgramCounter(programCounterState + instruction.length - 1);
            }
        }
    }

    #initOpcodes() {
        this.#instructionSet = new Map();

        const instructionBRK = () => this.#instructionBRK.call(this);
        const instructionTAX = () => this.#instructionTAX.call(this);
        const instructionINX = () => this.#instructionINX.call(this);
        const instructionLDA = (opcode) => this.#instructionLDA.call(this, opcode);
        const instructionSTA = (opcode) => this.#instructionSTA.call(this, opcode);

        this.#instructionSet.set(0x00, new Opcode(0x00, 'BRK', 1, 7, AddressingMode.none, instructionBRK));
        this.#instructionSet.set(0xAA, new Opcode(0xAA, 'TAX', 1, 2, AddressingMode.none, instructionTAX));
        this.#instructionSet.set(0xE8, new Opcode(0xE8, 'INX', 1, 2, AddressingMode.none, instructionINX));

        this.#instructionSet.set(0xA9, new Opcode(0xA9, 'LDA', 2, 2, AddressingMode.immediate, instructionLDA));
        this.#instructionSet.set(0xA5, new Opcode(0xA5, 'LDA', 2, 3, AddressingMode.zeroPage, instructionLDA));
        this.#instructionSet.set(0xB5, new Opcode(0xB5, 'LDA', 2, 4, AddressingMode.zeroPageX, instructionLDA));
        this.#instructionSet.set(0xAD, new Opcode(0xAD, 'LDA', 3, 4, AddressingMode.absolute, instructionLDA));
        this.#instructionSet.set(0xBD, new Opcode(0xBD, 'LDA', 3, 4/*+1 if page crossed*/, AddressingMode.absoluteX, instructionLDA));
        this.#instructionSet.set(0xB9, new Opcode(0xB9, 'LDA', 3, 4/*+1 if page crossed*/, AddressingMode.absoluteY, instructionLDA));
        this.#instructionSet.set(0xA1, new Opcode(0xA1, 'LDA', 2, 6, AddressingMode.indirectX, instructionLDA));
        this.#instructionSet.set(0xB1, new Opcode(0xB1, 'LDA', 2, 5/*+1 if page crossed*/, AddressingMode.indirectY, instructionLDA));

        this.#instructionSet.set(0x85, new Opcode(0x85, 'STA', 2, 3, AddressingMode.zeroPage, instructionSTA));
        this.#instructionSet.set(0x95, new Opcode(0x95, 'STA', 2, 4, AddressingMode.zeroPageX, instructionSTA));
        this.#instructionSet.set(0x8D, new Opcode(0x8D, 'STA', 3, 4, AddressingMode.absolute, instructionSTA));
        this.#instructionSet.set(0x9D, new Opcode(0x9D, 'STA', 3, 5, AddressingMode.absoluteX, instructionSTA));
        this.#instructionSet.set(0x99, new Opcode(0x99, 'STA', 3, 5, AddressingMode.absoluteY, instructionSTA));
        this.#instructionSet.set(0x81, new Opcode(0x85, 'STA', 2, 6, AddressingMode.indirectX, instructionSTA));
        this.#instructionSet.set(0x91, new Opcode(0x85, 'STA', 2, 6, AddressingMode.indirectY, instructionSTA));
    }

    #getOperandAddress(addressingMode) {
        if (addressingMode === AddressingMode.immediate) {
            return this.getProgramCounter();
        }

        if (addressingMode === AddressingMode.zeroPage) {
            return this.#memory.read(this.getProgramCounter());
        }

        if (addressingMode === AddressingMode.zeroPageX) {
            let operand = new DataView(new ArrayBuffer(1));

            operand.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterX());

            return operand.getUint8();
        }

        if (addressingMode === AddressingMode.zeroPageY) {
            let operand = new DataView(new ArrayBuffer(1));

            operand.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterY());

            return operand.getUint8();
        }

        if (addressingMode === AddressingMode.absolute) {
            return this.#memory.readWord(this.getProgramCounter());
        }

        if (addressingMode === AddressingMode.absoluteX) {
            let operand = new DataView(new ArrayBuffer(2));

            operand.setUint16(0, this.#memory.readWord(this.getProgramCounter()) + this.getRegisterX());

            return operand.getUint16();
        }

        if (addressingMode === AddressingMode.absoluteY) {
            let operand = new DataView(new ArrayBuffer(2));

            operand.setUint16(0, this.#memory.readWord(this.getProgramCounter()) + this.getRegisterY());

            return operand.getUint16();
        }

        if (addressingMode === AddressingMode.indirectX) {
            let pointer = new DataView(new ArrayBuffer(1));

            pointer.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterX());

            return this.#memory.readWord(pointer.getUint8());
        }

        if (addressingMode === AddressingMode.indirectY) {
            let pointer = new DataView(new ArrayBuffer(1));

            pointer.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterY());

            return this.#memory.readWord(pointer.getUint8());
        }

        return;
    }

    #instructionBRK() {
        return;
    }

    #instructionINX() {
        this.setRegisterX(this.getRegisterX() + 1);

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
    }

    #instructionLDA(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const value = this.#memory.read(operandAddress);

        this.setRegisterA(value);

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionSTA(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        this.#memory.write(operandAddress, this.getRegisterA());
    }

    #instructionTAX() {
        this.setRegisterX(this.getRegisterA());

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
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
