import Opcode from "./Opcode.js";
import AddressingMode from "./AddressingMode.js";

export default class CPU {
    PC_RESET = 0xFFFC;
    STACK_BASE = 0x0100;
    STACK_RESET = 0xFD;
    STATUS_RESET = 0b0010_0100;

    #memory;

    #programCounter;
    #stackPointer;

    //  7 6 5 4 3 2 1 0
    //  N V _ B D I Z C
    //  | | | | | | | +--- Carry Flag
    //  | | | | | | +----- Zero Flag
    //  | | | | | +------- Interrupt Disable
    //  | | | | +--------- Decimal Mode (not used on NES)
    //  | | | +----------- Break Command
    //  | | +------------- (Empty)
    //  | +--------------- Overflow Flag
    //  +----------------- Negative Flag
    //
    #status;

    #registerA;
    #registerX;
    #registerY;

    #instructionSet;

    constructor(memory) {
        this.#memory = memory;

        this.#programCounter = new DataView(new ArrayBuffer(2));
        this.#stackPointer = new DataView(new ArrayBuffer(1));
        this.#status = new DataView(new ArrayBuffer(1));

        this.#registerA = new DataView(new ArrayBuffer(1));
        this.#registerX = new DataView(new ArrayBuffer(1));
        this.#registerY = new DataView(new ArrayBuffer(1));

        this.#instructionSet = new Map();

        this.reset();

        this.#initOpcodes();
    }

    reset() {
        let programCounterStart = this.#memory.readWord(this.PC_RESET);

        if (programCounterStart === null) {
            programCounterStart = 0x0000;
        }

        this.setProgramCounter(programCounterStart);
        this.setStackPointer(this.STACK_RESET);
        this.setStatus(this.STATUS_RESET);
        this.setRegisterA(0);
        this.setRegisterX(0);
        this.setRegisterY(0);
    }

    getProgramCounter() {
        return this.#programCounter.getUint16();
    }

    getStackPointer() {
        return this.#stackPointer.getUint8();
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

    setProgramCounter(value) {
        this.#programCounter.setUint16(0, value);
    }

    incProgramCounter() {
        this.#programCounter.setUint16(0, this.getProgramCounter() + 1);
    }

    setStackPointer(value) {
        return this.#stackPointer.setUint8(0, value);
    }

    incStackPointer() {
        return this.#stackPointer.setUint8(0, this.getStackPointer() + 1);
    }

    decStackPointer() {
        return this.#stackPointer.setUint8(0, this.getStackPointer() - 1);
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

    setCarryFlag() {
        this.setStatus(this.getStatus() | 0b0000_0001);
    }

    unsetCarryFlag() {
        this.setStatus(this.getStatus() & 0b1111_1110);
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
        const instructionAND = (opcode) => this.#instructionAND.call(this, opcode);
        const instructionASLAccumulator = () => this.#instructionASLAccumulator.call(this);
        const instructionASL = (opcode) => this.#instructionASL.call(this, opcode);
        const instructionBRK = () => this.#instructionBRK.call(this);
        const instructionINX = () => this.#instructionINX.call(this);
        const instructionLDA = (opcode) => this.#instructionLDA.call(this, opcode);
        const instructionSTA = (opcode) => this.#instructionSTA.call(this, opcode);
        const instructionTAX = () => this.#instructionTAX.call(this);

        this.#instructionSet.set(0x29, new Opcode(0x29, 'AND', 2, 2, AddressingMode.immediate, instructionAND));
        this.#instructionSet.set(0x25, new Opcode(0x25, 'AND', 2, 3, AddressingMode.zeroPage, instructionAND));
        this.#instructionSet.set(0x35, new Opcode(0x35, 'AND', 2, 4, AddressingMode.zeroPageX, instructionAND));
        this.#instructionSet.set(0x2D, new Opcode(0x2D, 'AND', 3, 4, AddressingMode.absolute, instructionAND));
        this.#instructionSet.set(0x3D, new Opcode(0x3D, 'AND', 3, 4/*+1 if page crossed*/, AddressingMode.absoluteX, instructionAND));
        this.#instructionSet.set(0x39, new Opcode(0x39, 'AND', 3, 4/*+1 if page crossed*/, AddressingMode.absoluteY, instructionAND));
        this.#instructionSet.set(0x21, new Opcode(0x21, 'AND', 2, 6, AddressingMode.indirectX, instructionAND));
        this.#instructionSet.set(0x31, new Opcode(0x31, 'AND', 2, 5/*+1 if page crossed*/, AddressingMode.indirectY, instructionAND));

        this.#instructionSet.set(0x0A, new Opcode(0x0A, 'ASL', 1, 2, AddressingMode.none, instructionASLAccumulator));
        this.#instructionSet.set(0x06, new Opcode(0x06, 'ASL', 2, 5, AddressingMode.zeroPage, instructionASL));
        this.#instructionSet.set(0x16, new Opcode(0x16, 'ASL', 2, 6, AddressingMode.zeroPageX, instructionASL));
        this.#instructionSet.set(0x0E, new Opcode(0x0E, 'ASL', 3, 6, AddressingMode.absolute, instructionASL));
        this.#instructionSet.set(0x1E, new Opcode(0x1E, 'ASL', 3, 7, AddressingMode.absoluteX, instructionASL));

        this.#instructionSet.set(0x00, new Opcode(0x00, 'BRK', 1, 7, AddressingMode.none, instructionBRK));
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

        this.#instructionSet.set(0xAA, new Opcode(0xAA, 'TAX', 1, 2, AddressingMode.none, instructionTAX));
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

    #instructionAND(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const value = this.#memory.read(operandAddress);

        this.setRegisterA(this.getRegisterA() & value);

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionASL(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        let value = this.#memory.read(operandAddress);

        this.#checkCarryFlag(value);

        value <<= 1;

        this.#memory.write(value);

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionASLAccumulator() {
        let value = this.getRegisterA();

        this.#checkCarryFlag(value);

        value <<= 1;

        this.setRegisterA(value);

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
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

    #checkNegativeFlag(value) {
        // Check sign bit. if 1 then negative else positive
        if ((value & 0b1000_0000) == 0) {
            this.unsetNegativeFlag();
        } else {
            this.setNegativeFlag();
        }
    }

    #checkZeroFlag(value) {
        if (value == 0) {
            this.setZeroFlag();
        } else {
            this.unsetZeroFlag();
        }
    }

    #checkCarryFlag(value) {
        if ((value >>> 7) == 1) {
            this.setCarryFlag();
        } else {
            this.unsetCarryFlag();
        }
    }
}
