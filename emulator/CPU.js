import Opcode from "./Opcode.js";
import addressingModes from "./addressingModes.js";
import { signBitMask, statusMasks, statusUnsetMasks } from "./masks.js";

export default class CPU {
    PC_RESET = 0xFFFC;
    STACK_BASE = 0x0100;
    STACK_RESET = 0xFD;
    STATUS_RESET = statusMasks.EMPTY | statusMasks.INTERRUPT;

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
        return this.#stackPointer.getUint8(0);
    }

    getStatus() {
        return this.#status.getUint8(0);
    }

    isCarryFlagClear() {
        return (this.#status.getUint8(0) & statusMasks.CARRY) === 0;
    }

    isCarryFlagSet() {
        return (this.#status.getUint8(0) & statusMasks.CARRY) === statusMasks.CARRY;
    }

    isZeroFlagClear() {
        return (this.#status.getUint8(0) & statusMasks.ZERO) === 0;
    }

    isZeroFlagSet() {
        return (this.#status.getUint8(0) & statusMasks.ZERO) === statusMasks.ZERO;
    }

    isOverflowFlagClear() {
        return (this.#status.getUint8(0) & statusMasks.OVERFLOW) === 0;
    }

    isOverflowFlagSet() {
        return (this.#status.getUint8(0) & statusMasks.OVERFLOW) === statusMasks.OVERFLOW;
    }

    isNegativeFlagClear() {
        return (this.#status.getUint8(0) & statusMasks.NEGATIVE) === 0;
    }

    isNegativeFlagSet() {
        return (this.#status.getUint8(0) & statusMasks.NEGATIVE) === statusMasks.NEGATIVE;
    }

    getRegisterA() {
        return this.#registerA.getUint8(0);
    }

    getRegisterX() {
        return this.#registerX.getUint8(0);
    }

    getRegisterY() {
        return this.#registerY.getUint8(0);
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

    pushStack(value) {
        this.#memory.write(this.STACK_BASE + this.getStackPointer(), value);
        this.decStackPointer();
    }

    pushWordStack(value) {
        const hi = value >> 8;
        const lo = value & 0xFF;

        this.pushStack(hi);
        this.pushStack(lo);
    }

    popStack() {
        this.incStackPointer();
        return this.#memory.read(this.STACK_BASE + this.getStackPointer());
    }

    popWordStack() {
        const lo = this.popStack();
        const hi = this.popStack();

        return (hi << 8) | (lo);
    }

    setStatus(value) {
        this.#status.setUint8(0, value);
    }

    setCarryFlag() {
        this.setStatus(this.getStatus() | statusMasks.CARRY);
    }

    clearCarryFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.CARRY);
    }

    setZeroFlag() {
        this.setStatus(this.getStatus() | statusMasks.ZERO);
    }

    clearZeroFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.ZERO);
    }

    setInterruptFlag() {
        this.setStatus(this.getStatus() | statusMasks.INTERRUPT);
    }

    clearInterruptFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.INTERRUPT);
    }

    setDecimalFlag() {
        this.setStatus(this.getStatus() | statusMasks.DECIMAL);
    }

    clearDecimalFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.DECIMAL);
    }

    setOverflowFlag() {
        this.setStatus(this.getStatus() | statusMasks.OVERFLOW);
    }

    clearOverflowFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.OVERFLOW);
    }

    setNegativeFlag() {
        this.setStatus(this.getStatus() | statusMasks.NEGATIVE);
    }

    clearNegativeFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.NEGATIVE);
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
        const instructionADC = (opcode) => this.#instructionADC.call(this, opcode);
        const instructionAND = (opcode) => this.#instructionAND.call(this, opcode);
        const instructionASLAccumulator = () => this.#instructionASLAccumulator.call(this);
        const instructionASL = (opcode) => this.#instructionASL.call(this, opcode);
        const instructionBCC = (opcode) => this.#instructionBCC.call(this, opcode);
        const instructionBCS = (opcode) => this.#instructionBCS.call(this, opcode);
        const instructionBEQ = (opcode) => this.#instructionBEQ.call(this, opcode);
        const instructionBIT = (opcode) => this.#instructionBIT.call(this, opcode);
        const instructionBMI = (opcode) => this.#instructionBMI.call(this, opcode);
        const instructionBNE = (opcode) => this.#instructionBNE.call(this, opcode);
        const instructionBPL = (opcode) => this.#instructionBPL.call(this, opcode);
        const instructionBRK = () => this.#instructionBRK.call(this);
        const instructionBVC = (opcode) => this.#instructionBVC.call(this, opcode);
        const instructionBVS = (opcode) => this.#instructionBVS.call(this, opcode);
        const instructionCLC = () => this.#instructionCLC.call(this);
        const instructionCLD = () => this.#instructionCLD.call(this);
        const instructionCLI = () => this.#instructionCLI.call(this);
        const instructionCLV = () => this.#instructionCLV.call(this);
        const instructionCMP = (opcode) => this.#instructionCMP.call(this, opcode);
        const instructionCPX = (opcode) => this.#instructionCPX.call(this, opcode);
        const instructionCPY = (opcode) => this.#instructionCPY.call(this, opcode);
        const instructionDEC = (opcode) => this.#instructionDEC.call(this, opcode);
        const instructionDEX = () => this.#instructionDEX.call(this);
        const instructionDEY = () => this.#instructionDEY.call(this);
        const instructionEOR = (opcode) => this.#instructionEOR.call(this, opcode);
        const instructionINC = (opcode) => this.#instructionINC.call(this, opcode);
        const instructionINX = () => this.#instructionINX.call(this);
        const instructionINY = () => this.#instructionINY.call(this);
        const instructionJMP = (opcode) => this.#instructionJMP.call(this, opcode);
        const instructionJSR = () => this.#instructionJSR.call(this);
        const instructionLDA = (opcode) => this.#instructionLDA.call(this, opcode);
        const instructionSEC = () => this.#instructionSEC.call(this);
        const instructionSED = () => this.#instructionSED.call(this);
        const instructionSEI = () => this.#instructionSEI.call(this);
        const instructionSTA = (opcode) => this.#instructionSTA.call(this, opcode);
        const instructionTAX = () => this.#instructionTAX.call(this);

        this.#instructionSet.set(0x69, new Opcode(0x69, 'ADC', 2, 2, addressingModes.immediate, instructionADC));
        this.#instructionSet.set(0x65, new Opcode(0x65, 'ADC', 2, 3, addressingModes.zeroPage, instructionADC));
        this.#instructionSet.set(0x75, new Opcode(0x75, 'ADC', 2, 4, addressingModes.zeroPageX, instructionADC));
        this.#instructionSet.set(0x6D, new Opcode(0x6D, 'ADC', 3, 4, addressingModes.absolute, instructionADC));
        this.#instructionSet.set(0x7D, new Opcode(0x7D, 'ADC', 3, 4/*+1 if page crossed*/, addressingModes.absoluteX, instructionADC));
        this.#instructionSet.set(0x79, new Opcode(0x79, 'ADC', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionADC));
        this.#instructionSet.set(0x61, new Opcode(0x61, 'ADC', 2, 6, addressingModes.indirectX, instructionADC));
        this.#instructionSet.set(0x71, new Opcode(0x71, 'ADC', 2, 5/*+1 if page crossed*/, addressingModes.indirectX, instructionADC));

        this.#instructionSet.set(0x29, new Opcode(0x29, 'AND', 2, 2, addressingModes.immediate, instructionAND));
        this.#instructionSet.set(0x25, new Opcode(0x25, 'AND', 2, 3, addressingModes.zeroPage, instructionAND));
        this.#instructionSet.set(0x35, new Opcode(0x35, 'AND', 2, 4, addressingModes.zeroPageX, instructionAND));
        this.#instructionSet.set(0x2D, new Opcode(0x2D, 'AND', 3, 4, addressingModes.absolute, instructionAND));
        this.#instructionSet.set(0x3D, new Opcode(0x3D, 'AND', 3, 4/*+1 if page crossed*/, addressingModes.absoluteX, instructionAND));
        this.#instructionSet.set(0x39, new Opcode(0x39, 'AND', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionAND));
        this.#instructionSet.set(0x21, new Opcode(0x21, 'AND', 2, 6, addressingModes.indirectX, instructionAND));
        this.#instructionSet.set(0x31, new Opcode(0x31, 'AND', 2, 5/*+1 if page crossed*/, addressingModes.indirectY, instructionAND));

        this.#instructionSet.set(0x0A, new Opcode(0x0A, 'ASL', 1, 2, addressingModes.none, instructionASLAccumulator));
        this.#instructionSet.set(0x06, new Opcode(0x06, 'ASL', 2, 5, addressingModes.zeroPage, instructionASL));
        this.#instructionSet.set(0x16, new Opcode(0x16, 'ASL', 2, 6, addressingModes.zeroPageX, instructionASL));
        this.#instructionSet.set(0x0E, new Opcode(0x0E, 'ASL', 3, 6, addressingModes.absolute, instructionASL));
        this.#instructionSet.set(0x1E, new Opcode(0x1E, 'ASL', 3, 7, addressingModes.absoluteX, instructionASL));

        this.#instructionSet.set(0x90, new Opcode(0x90, 'BCC', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBCC));
        this.#instructionSet.set(0xB0, new Opcode(0xB0, 'BCS', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBCS));
        this.#instructionSet.set(0xF0, new Opcode(0xF0, 'BEQ', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBEQ));

        this.#instructionSet.set(0x24, new Opcode(0x24, 'BIT', 2, 3, addressingModes.zeroPage, instructionBIT));
        this.#instructionSet.set(0x2C, new Opcode(0x2C, 'BIT', 3, 4, addressingModes.absolute, instructionBIT));

        this.#instructionSet.set(0x30, new Opcode(0x30, 'BMI', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBMI));
        this.#instructionSet.set(0xD0, new Opcode(0xD0, 'BNE', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBNE));
        this.#instructionSet.set(0x10, new Opcode(0x10, 'BPL', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBPL));

        this.#instructionSet.set(0x00, new Opcode(0x00, 'BRK', 1, 7, addressingModes.none, instructionBRK));

        this.#instructionSet.set(0x50, new Opcode(0x50, 'BVC', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBVC));
        this.#instructionSet.set(0x70, new Opcode(0x70, 'BVS', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBVS));

        this.#instructionSet.set(0x18, new Opcode(0x18, 'CLC', 1, 2, addressingModes.none, instructionCLC));
        this.#instructionSet.set(0xD8, new Opcode(0xD8, 'CLD', 1, 2, addressingModes.none, instructionCLD));
        this.#instructionSet.set(0x58, new Opcode(0x58, 'CLI', 1, 2, addressingModes.none, instructionCLI));
        this.#instructionSet.set(0xB8, new Opcode(0xB8, 'CLV', 1, 2, addressingModes.none, instructionCLV));

        this.#instructionSet.set(0xC9, new Opcode(0xC9, 'CMP', 2, 2, addressingModes.immediate, instructionCMP));
        this.#instructionSet.set(0xC5, new Opcode(0xC5, 'CMP', 2, 3, addressingModes.zeroPage, instructionCMP));
        this.#instructionSet.set(0xD5, new Opcode(0xD5, 'CMP', 2, 4, addressingModes.zeroPageX, instructionCMP));
        this.#instructionSet.set(0xCD, new Opcode(0xCD, 'CMP', 3, 4, addressingModes.absolute, instructionCMP));
        this.#instructionSet.set(0xDD, new Opcode(0xDD, 'CMP', 3, 4, addressingModes.absoluteX/*+1 if page crossed*/, instructionCMP));
        this.#instructionSet.set(0xD9, new Opcode(0xD9, 'CMP', 3, 4, addressingModes.absoluteY/*+1 if page crossed*/, instructionCMP));
        this.#instructionSet.set(0xC1, new Opcode(0xC1, 'CMP', 2, 6, addressingModes.indirectX, instructionCMP));
        this.#instructionSet.set(0xD1, new Opcode(0xD1, 'CMP', 2, 5, addressingModes.indirectY/*+1 if page crossed*/, instructionCMP));

        this.#instructionSet.set(0xE0, new Opcode(0xE0, 'CPX', 2, 2, addressingModes.immediate, instructionCPX));
        this.#instructionSet.set(0xE4, new Opcode(0xE4, 'CPX', 2, 3, addressingModes.zeroPage, instructionCPX));
        this.#instructionSet.set(0xEC, new Opcode(0xEC, 'CPX', 3, 4, addressingModes.absolute, instructionCPX));

        this.#instructionSet.set(0xC0, new Opcode(0xC0, 'CPY', 2, 2, addressingModes.immediate, instructionCPY));
        this.#instructionSet.set(0xC4, new Opcode(0xC4, 'CPY', 2, 3, addressingModes.zeroPage, instructionCPY));
        this.#instructionSet.set(0xCC, new Opcode(0xCC, 'CPY', 3, 4, addressingModes.absolute, instructionCPY));

        this.#instructionSet.set(0xC6, new Opcode(0xC6, 'DEC', 2, 5, addressingModes.zeroPage, instructionDEC));
        this.#instructionSet.set(0xD6, new Opcode(0xD6, 'DEC', 2, 6, addressingModes.zeroPageX, instructionDEC));
        this.#instructionSet.set(0xCE, new Opcode(0xCE, 'DEC', 3, 6, addressingModes.absolute, instructionDEC));
        this.#instructionSet.set(0xDE, new Opcode(0xDE, 'DEC', 3, 7, addressingModes.absoluteX, instructionDEC));

        this.#instructionSet.set(0xCA, new Opcode(0xCA, 'DEX', 1, 2, addressingModes.none, instructionDEX));
        this.#instructionSet.set(0x88, new Opcode(0x88, 'DEY', 1, 2, addressingModes.none, instructionDEY));

        this.#instructionSet.set(0x49, new Opcode(0x49, 'EOR', 2, 2, addressingModes.immediate, instructionEOR));
        this.#instructionSet.set(0x45, new Opcode(0x45, 'EOR', 2, 3, addressingModes.zeroPage, instructionEOR));
        this.#instructionSet.set(0x55, new Opcode(0x55, 'EOR', 2, 4, addressingModes.zeroPageX, instructionEOR));
        this.#instructionSet.set(0x4D, new Opcode(0x4D, 'EOR', 3, 4, addressingModes.absolute, instructionEOR));
        this.#instructionSet.set(0x5D, new Opcode(0x5D, 'EOR', 3, 4/*+1 if page crossed*/, addressingModes.absoluteX, instructionEOR));
        this.#instructionSet.set(0x59, new Opcode(0x59, 'EOR', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionEOR));
        this.#instructionSet.set(0x41, new Opcode(0x41, 'EOR', 2, 6, addressingModes.indirectX, instructionEOR));
        this.#instructionSet.set(0x51, new Opcode(0x51, 'EOR', 2, 5/*+1 if page crossed*/, addressingModes.indirectY, instructionEOR));

        this.#instructionSet.set(0xE6, new Opcode(0xE6, 'INC', 2, 5, addressingModes.zeroPage, instructionINC));
        this.#instructionSet.set(0xF6, new Opcode(0xF6, 'INC', 2, 6, addressingModes.zeroPageX, instructionINC));
        this.#instructionSet.set(0xEE, new Opcode(0xEE, 'INC', 3, 6, addressingModes.absolute, instructionINC));
        this.#instructionSet.set(0xFE, new Opcode(0xFE, 'INC', 3, 7, addressingModes.absoluteX, instructionINC));

        this.#instructionSet.set(0xE8, new Opcode(0xE8, 'INX', 1, 2, addressingModes.none, instructionINX));
        this.#instructionSet.set(0xC8, new Opcode(0xC8, 'INY', 1, 2, addressingModes.none, instructionINY));

        this.#instructionSet.set(0x4C, new Opcode(0x4C, 'JMP', 3, 3, addressingModes.absolute, instructionJMP));
        this.#instructionSet.set(0x6C, new Opcode(0x6C, 'JMP', 3, 5, addressingModes.indirect, instructionJMP));

        this.#instructionSet.set(0x20, new Opcode(0x20, 'JSR', 3, 6, addressingModes.absolute, instructionJSR));

        this.#instructionSet.set(0xA9, new Opcode(0xA9, 'LDA', 2, 2, addressingModes.immediate, instructionLDA));
        this.#instructionSet.set(0xA5, new Opcode(0xA5, 'LDA', 2, 3, addressingModes.zeroPage, instructionLDA));
        this.#instructionSet.set(0xB5, new Opcode(0xB5, 'LDA', 2, 4, addressingModes.zeroPageX, instructionLDA));
        this.#instructionSet.set(0xAD, new Opcode(0xAD, 'LDA', 3, 4, addressingModes.absolute, instructionLDA));
        this.#instructionSet.set(0xBD, new Opcode(0xBD, 'LDA', 3, 4/*+1 if page crossed*/, addressingModes.absoluteX, instructionLDA));
        this.#instructionSet.set(0xB9, new Opcode(0xB9, 'LDA', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionLDA));
        this.#instructionSet.set(0xA1, new Opcode(0xA1, 'LDA', 2, 6, addressingModes.indirectX, instructionLDA));
        this.#instructionSet.set(0xB1, new Opcode(0xB1, 'LDA', 2, 5/*+1 if page crossed*/, addressingModes.indirectY, instructionLDA));

        this.#instructionSet.set(0x38, new Opcode(0x38, 'SEC', 1, 2, addressingModes.none, instructionSEC));
        this.#instructionSet.set(0xF8, new Opcode(0xF8, 'SED', 1, 2, addressingModes.none, instructionSED));
        this.#instructionSet.set(0x78, new Opcode(0x78, 'SEI', 1, 2, addressingModes.none, instructionSEI));

        this.#instructionSet.set(0x85, new Opcode(0x85, 'STA', 2, 3, addressingModes.zeroPage, instructionSTA));
        this.#instructionSet.set(0x95, new Opcode(0x95, 'STA', 2, 4, addressingModes.zeroPageX, instructionSTA));
        this.#instructionSet.set(0x8D, new Opcode(0x8D, 'STA', 3, 4, addressingModes.absolute, instructionSTA));
        this.#instructionSet.set(0x9D, new Opcode(0x9D, 'STA', 3, 5, addressingModes.absoluteX, instructionSTA));
        this.#instructionSet.set(0x99, new Opcode(0x99, 'STA', 3, 5, addressingModes.absoluteY, instructionSTA));
        this.#instructionSet.set(0x81, new Opcode(0x85, 'STA', 2, 6, addressingModes.indirectX, instructionSTA));
        this.#instructionSet.set(0x91, new Opcode(0x85, 'STA', 2, 6, addressingModes.indirectY, instructionSTA));

        this.#instructionSet.set(0xAA, new Opcode(0xAA, 'TAX', 1, 2, addressingModes.none, instructionTAX));
    }

    #getOperandAddress(addressingMode) {
        if (addressingMode === addressingModes.immediate) {
            return this.getProgramCounter();
        }

        if (addressingMode === addressingModes.relative) {
            const offset = this.#memory.read(this.getProgramCounter());
            return this.getProgramCounter() + 1 + offset;
        }

        if (addressingMode === addressingModes.zeroPage) {
            return this.#memory.read(this.getProgramCounter());
        }

        if (addressingMode === addressingModes.zeroPageX) {
            let operand = new DataView(new ArrayBuffer(1));

            operand.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterX());

            return operand.getUint8(0);
        }

        if (addressingMode === addressingModes.zeroPageY) {
            let operand = new DataView(new ArrayBuffer(1));

            operand.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterY());

            return operand.getUint8(0);
        }

        if (addressingMode === addressingModes.absolute) {
            return this.#memory.readWord(this.getProgramCounter());
        }

        if (addressingMode === addressingModes.absoluteX) {
            let operand = new DataView(new ArrayBuffer(2));

            operand.setUint16(0, this.#memory.readWord(this.getProgramCounter()) + this.getRegisterX());

            return operand.getUint16();
        }

        if (addressingMode === addressingModes.absoluteY) {
            let operand = new DataView(new ArrayBuffer(2));

            operand.setUint16(0, this.#memory.readWord(this.getProgramCounter()) + this.getRegisterY());

            return operand.getUint16();
        }

        if (addressingMode === addressingModes.indirectX) {
            let pointer = new DataView(new ArrayBuffer(1));

            pointer.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterX());

            return this.#memory.readWord(pointer.getUint8(0));
        }

        if (addressingMode === addressingModes.indirectY) {
            let pointer = new DataView(new ArrayBuffer(1));

            pointer.setUint8(0, this.#memory.read(this.getProgramCounter()) + this.getRegisterY());

            return this.#memory.readWord(pointer.getUint8(0));
        }

        return;
    }

    #instructionADC(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const value = this.#memory.read(operandAddress);

        let sum = this.getRegisterA() + value;

        if (this.isCarryFlagSet()) {
            sum += 1;
        }

        if (sum > 0xFF) {
            this.setCarryFlag();
        }

        const result = new DataView(new ArrayBuffer(1));

        result.setUint8(0, sum);

        // If both terms have equal signs but the sum's sign is different, then overflow is set.
        // http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
        if (
            (
                (result.getUint8(0) ^ this.getRegisterA()) &
                (result.getUint8(0) ^ value) &
                signBitMask
            ) != 0
        ) {
            this.setOverflowFlag();
        } else {
            this.clearOverflowFlag();
        }

        this.setRegisterA(result.getUint8(0));

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionAND(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);
        const result = this.getRegisterA() & memoryValue;

        this.setRegisterA(result);
        this.#checkZeroFlag(result);
        this.#checkNegativeFlag(result);
    }

    #instructionASL(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        let value = this.#memory.read(operandAddress);

        this.#checkCarryFlagASL(value);

        value <<= 1;

        this.#memory.write(operandAddress, value);

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionASLAccumulator() {
        let value = this.getRegisterA();

        this.#checkCarryFlagASL(value);

        value <<= 1;

        this.setRegisterA(value);

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionBCC(opcode) {
        if (this.isCarryFlagClear()) {
            this.#branch(opcode);
        }
    }

    #instructionBCS(opcode) {
        if (this.isCarryFlagSet()) {
            this.#branch(opcode);
        }
    }

    #instructionBEQ(opcode) {
        if (this.isZeroFlagSet()) {
            this.#branch(opcode);
        }
    }

    #instructionBIT(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        let memoryValue = this.#memory.read(operandAddress);

        if ((memoryValue & statusMasks.OVERFLOW) != 0) {
            this.setOverflowFlag();
        } else {
            this.clearOverflowFlag();
        }

        if ((memoryValue & statusMasks.NEGATIVE) != 0) {
            this.setNegativeFlag();
        } else {
            this.clearNegativeFlag();
        }

        this.#checkZeroFlag(this.getRegisterA() & memoryValue);
    }

    #instructionBMI(opcode) {
        if (this.isNegativeFlagSet()) {
            this.#branch(opcode);
        }
    }

    #instructionBNE(opcode) {
        if (this.isZeroFlagClear()) {
            this.#branch(opcode);
        }
    }

    #instructionBPL(opcode) {
        if (this.isNegativeFlagClear()) {
            this.#branch(opcode);
        }
    }

    #instructionBRK() {
        return;
    }

    #instructionBVC(opcode) {
        if (this.isOverflowFlagClear()) {
            this.#branch(opcode);
        }
    }

    #instructionBVS(opcode) {
        if (this.isOverflowFlagSet()) {
            this.#branch(opcode);
        }
    }

    #instructionCLC() {
        this.clearCarryFlag();
    }

    #instructionCLD() {
        this.clearDecimalFlag();
    }

    #instructionCLI() {
        this.clearInterruptFlag();
    }

    #instructionCLV() {
        this.clearOverflowFlag();
    }

    #instructionCMP(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);
        const result = this.getRegisterA() - memoryValue;

        if (result >= 0) {
            this.setCarryFlag();
        }

        this.#checkZeroFlag(result);
        this.#checkNegativeFlag(result);
    }

    #instructionCPX(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);
        const result = this.getRegisterX() - memoryValue;

        if (result >= 0) {
            this.setCarryFlag();
        }

        this.#checkZeroFlag(result);
        this.#checkNegativeFlag(result);
    }

    #instructionCPY(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);
        const result = this.getRegisterY() - memoryValue;

        if (result >= 0) {
            this.setCarryFlag();
        }

        this.#checkZeroFlag(result);
        this.#checkNegativeFlag(result);
    }

    #instructionDEC(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        let memoryValue = this.#memory.read(operandAddress);

        memoryValue -= 1;

        this.#memory.write(operandAddress, memoryValue);

        this.#checkZeroFlag(memoryValue);
        this.#checkNegativeFlag(memoryValue);
    }

    #instructionDEX() {
        let registerValue = this.getRegisterX();

        registerValue -= 1;

        this.setRegisterX(registerValue);

        this.#checkZeroFlag(registerValue);
        this.#checkNegativeFlag(registerValue);
    }

    #instructionDEY() {
        let registerValue = this.getRegisterY();

        registerValue -= 1;

        this.setRegisterY(registerValue);

        this.#checkZeroFlag(registerValue);
        this.#checkNegativeFlag(registerValue);
    }

    #instructionEOR(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);
        const result = this.getRegisterA() ^ memoryValue;

        this.setRegisterA(result);

        this.#checkZeroFlag(result);
        this.#checkNegativeFlag(result);
    }

    #instructionINC(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        let value = this.#memory.read(operandAddress);

        value += 1;

        this.#memory.write(operandAddress, value);

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionINX() {
        this.setRegisterX(this.getRegisterX() + 1);

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
    }

    #instructionINY() {
        this.setRegisterY(this.getRegisterY() + 1);

        this.#checkZeroFlag(this.getRegisterY());
        this.#checkNegativeFlag(this.getRegisterY());
    }

    #instructionJMP(opcode) {
        const memoryAddress = this.#memory.readWord(this.getProgramCounter());

        if (opcode.mode === addressingModes.absolute) {
            this.setProgramCounter(memoryAddress);
            return;
        }

        let indirectAddress;

        // if address $3000 contains $40, $30FF contains $80, and $3100 contains $50,
        // the result of JMP ($30FF) will be a transfer of control to $4080 rather than $5080 as you intended
        // i.e. the 6502 took the low byte of the address from $30FF and the high byte from $3000
        if ((memoryAddress & 0x00FF) === 0x00FF) {
            const lo = this.#memory.read(memoryAddress);
            const hi = this.#memory.read(memoryAddress & 0xFF00);

            indirectAddress = (hi << 8) | (lo);
        } else {
            indirectAddress = this.#memory.readWord(memoryAddress);
        }

        this.setProgramCounter(indirectAddress);
    }

    #instructionJSR() {
        // return point: next instruction - 1
        this.pushWordStack(this.getProgramCounter() + 2 - 1);

        const memoryAddress = this.#memory.readWord(this.getProgramCounter());

        this.setProgramCounter(memoryAddress);
    }

    #instructionLDA(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        this.setRegisterA(memoryValue);

        this.#checkZeroFlag(memoryValue);
        this.#checkNegativeFlag(memoryValue);
    }

    #instructionLDX(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        this.setRegisterX(memoryValue);

        this.#checkZeroFlag(memoryValue);
        this.#checkNegativeFlag(memoryValue);
    }

    #instructionLDY(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        this.setRegisterY(memoryValue);

        this.#checkZeroFlag(memoryValue);
        this.#checkNegativeFlag(memoryValue);
    }

    #instructionLSR(opcode) {
        // TODO
    }

    #instructionNOP(opcode) {
        // TODO
    }

    #instructionORA(opcode) {
        // TODO
    }

    #instructionPHA(opcode) {
        // TODO
    }

    #instructionPHP(opcode) {
        // TODO
    }

    #instructionPLA(opcode) {
        // TODO
    }

    #instructionPLP(opcode) {
        // TODO
    }

    #instructionROL(opcode) {
        // TODO
    }

    #instructionROR(opcode) {
        // TODO
    }

    #instructionRTI(opcode) {
        // TODO
    }

    #instructionRTS(opcode) {
        // TODO
    }

    #instructionSBC(opcode) {
        // TODO
    }

    #instructionSEC() {
        this.setCarryFlag();
    }

    #instructionSED() {
        this.setDecimalFlag();
    }

    #instructionSEI() {
        this.setInterruptFlag();
    }

    #instructionSTA(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        this.#memory.write(operandAddress, this.getRegisterA());
    }

    #instructionSTX(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        this.#memory.write(operandAddress, this.getRegisterX());
    }

    #instructionSTY(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        this.#memory.write(operandAddress, this.getRegisterY());
    }

    #instructionTAX() {
        this.setRegisterX(this.getRegisterA());

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
    }

    #instructionTAY() {
        this.setRegisterY(this.getRegisterA());

        this.#checkZeroFlag(this.getRegisterY());
        this.#checkNegativeFlag(this.getRegisterY());
    }

    #instructionTSX(opcode) {
        // TODO
    }

    #instructionTXA(opcode) {
        this.setRegisterA(this.getRegisterX());

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionTXS(opcode) {
        // TODO
    }

    #instructionTYA() {
        this.setRegisterA(this.getRegisterY());

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #branch(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);

        this.setProgramCounter(operandAddress);
    }

    #checkCarryFlagASL(value) {
        if ((value >>> 7) == 1) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }
    }

    #checkZeroFlag(value) {
        if (value === 0) {
            this.setZeroFlag();
        } else {
            this.clearZeroFlag();
        }
    }

    #checkNegativeFlag(value) {
        // Check sign bit. if 1 then negative else positive
        if ((value & signBitMask) === signBitMask) {
            this.setNegativeFlag();
        } else {
            this.clearNegativeFlag();
        }
    }
}
