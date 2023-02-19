import Opcode from "./Opcode.js";
import Binary8 from "./Binary8.js";
import Binary16 from "./Binary16.js";
import addressingModes from "./addressingModes.js";
import { signBitMask, statusMasks, statusUnsetMasks } from "./masks.js";
import { twosComplement } from "./helpers.js";

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

        this.#programCounter = new Binary16();
        this.#stackPointer = new Binary8();
        this.#status = new Binary8();

        this.#registerA = new Binary8();
        this.#registerX = new Binary8();
        this.#registerY = new Binary8();

        this.#instructionSet = new Map();
        this.#initInstructions();
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
        return this.#programCounter.get();
    }

    getStackPointer() {
        return this.#stackPointer.get();
    }

    getStatus() {
        return this.#status.get();
    }

    isCarryFlagClear() {
        return (this.#status.get() & statusMasks.CARRY) === 0;
    }

    isCarryFlagSet() {
        return (this.#status.get() & statusMasks.CARRY) === statusMasks.CARRY;
    }

    isZeroFlagClear() {
        return (this.#status.get() & statusMasks.ZERO) === 0;
    }

    isZeroFlagSet() {
        return (this.#status.get() & statusMasks.ZERO) === statusMasks.ZERO;
    }

    isOverflowFlagClear() {
        return (this.#status.get() & statusMasks.OVERFLOW) === 0;
    }

    isOverflowFlagSet() {
        return (this.#status.get() & statusMasks.OVERFLOW) === statusMasks.OVERFLOW;
    }

    isNegativeFlagClear() {
        return (this.#status.get() & statusMasks.NEGATIVE) === 0;
    }

    isNegativeFlagSet() {
        return (this.#status.get() & statusMasks.NEGATIVE) === statusMasks.NEGATIVE;
    }

    getRegisterA() {
        return this.#registerA.get();
    }

    getRegisterX() {
        return this.#registerX.get();
    }

    getRegisterY() {
        return this.#registerY.get();
    }

    setProgramCounter(value) {
        this.#programCounter.set(value);
    }

    incProgramCounter() {
        this.#programCounter.increment();
    }

    setStackPointer(value) {
        return this.#stackPointer.set(value);
    }

    incStackPointer() {
        return this.#stackPointer.increment();
    }

    decStackPointer() {
        return this.#stackPointer.decrement();
    }

    pushStack(value) {
        this.#memory.write(this.STACK_BASE + this.getStackPointer(), value);
        this.decStackPointer();
    }

    pushWordStack(value) {
        const hi = value >>> 8;
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
        this.#status.set(value);
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
        return this.#registerA.set(value);
    }

    setRegisterX(value) {
        return this.#registerX.set(value);
    }

    setRegisterY(value) {
        return this.#registerY.set(value);
    }

    async run(callback) {
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

            await callback();
        }
    }

    #initInstructions() {
        const instructionADC = (opcode) => this.#instructionADC.call(this, opcode);
        const instructionAND = (opcode) => this.#instructionAND.call(this, opcode);
        const instructionASL = (opcode) => this.#instructionASL.call(this, opcode);
        const instructionBCC = (opcode) => this.#instructionBCC.call(this, opcode);
        const instructionBCS = (opcode) => this.#instructionBCS.call(this, opcode);
        const instructionBEQ = (opcode) => this.#instructionBEQ.call(this, opcode);
        const instructionBIT = (opcode) => this.#instructionBIT.call(this, opcode);
        const instructionBMI = (opcode) => this.#instructionBMI.call(this, opcode);
        const instructionBNE = (opcode) => this.#instructionBNE.call(this, opcode);
        const instructionBPL = (opcode) => this.#instructionBPL.call(this, opcode);
        const instructionBRK = (opcode) => this.#instructionBRK.call(this);
        const instructionBVC = (opcode) => this.#instructionBVC.call(this, opcode);
        const instructionBVS = (opcode) => this.#instructionBVS.call(this, opcode);
        const instructionCLC = (opcode) => this.#instructionCLC.call(this);
        const instructionCLD = (opcode) => this.#instructionCLD.call(this);
        const instructionCLI = (opcode) => this.#instructionCLI.call(this);
        const instructionCLV = (opcode) => this.#instructionCLV.call(this);
        const instructionCMP = (opcode) => this.#instructionCMP.call(this, opcode);
        const instructionCPX = (opcode) => this.#instructionCPX.call(this, opcode);
        const instructionCPY = (opcode) => this.#instructionCPY.call(this, opcode);
        const instructionDEC = (opcode) => this.#instructionDEC.call(this, opcode);
        const instructionDEX = (opcode) => this.#instructionDEX.call(this);
        const instructionDEY = (opcode) => this.#instructionDEY.call(this);
        const instructionEOR = (opcode) => this.#instructionEOR.call(this, opcode);
        const instructionINC = (opcode) => this.#instructionINC.call(this, opcode);
        const instructionINX = (opcode) => this.#instructionINX.call(this);
        const instructionINY = (opcode) => this.#instructionINY.call(this);
        const instructionJMP = (opcode) => this.#instructionJMP.call(this, opcode);
        const instructionJSR = (opcode) => this.#instructionJSR.call(this);
        const instructionLDA = (opcode) => this.#instructionLDA.call(this, opcode);
        const instructionLDX = (opcode) => this.#instructionLDX.call(this, opcode);
        const instructionLDY = (opcode) => this.#instructionLDY.call(this, opcode);
        const instructionLSR = (opcode) => this.#instructionLSR.call(this, opcode);
        const instructionNOP = (opcode) => this.#instructionNOP.call(this);
        const instructionORA = (opcode) => this.#instructionORA.call(this, opcode);
        const instructionPHA = (opcode) => this.#instructionPHA.call(this);
        const instructionPHP = (opcode) => this.#instructionPHP.call(this);
        const instructionPLA = (opcode) => this.#instructionPLA.call(this);
        const instructionPLP = (opcode) => this.#instructionPLP.call(this);
        const instructionROL = (opcode) => this.#instructionROL.call(this, opcode);
        const instructionROR = (opcode) => this.#instructionROR.call(this, opcode);
        const instructionRTI = (opcode) => this.#instructionRTI.call(this);
        const instructionRTS = (opcode) => this.#instructionRTS.call(this);
        const instructionSBC = (opcode) => this.#instructionSBC.call(this, opcode);
        const instructionSEC = (opcode) => this.#instructionSEC.call(this);
        const instructionSED = (opcode) => this.#instructionSED.call(this);
        const instructionSEI = (opcode) => this.#instructionSEI.call(this);
        const instructionSTX = (opcode) => this.#instructionSTX.call(this, opcode);
        const instructionSTY = (opcode) => this.#instructionSTY.call(this, opcode);
        const instructionSTA = (opcode) => this.#instructionSTA.call(this, opcode);
        const instructionTAX = (opcode) => this.#instructionTAX.call(this);
        const instructionTAY = (opcode) => this.#instructionTAY.call(this);
        const instructionTSX = (opcode) => this.#instructionTSX.call(this);
        const instructionTXA = (opcode) => this.#instructionTXA.call(this);
        const instructionTXS = (opcode) => this.#instructionTXS.call(this);
        const instructionTYA = (opcode) => this.#instructionTYA.call(this);

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

        this.#instructionSet.set(0x0A, new Opcode(0x0A, 'ASL', 1, 2, addressingModes.accumulator, instructionASL));
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

        this.#instructionSet.set(0xA2, new Opcode(0xA2, 'LDX', 2, 2, addressingModes.immediate, instructionLDX));
        this.#instructionSet.set(0xA6, new Opcode(0xA6, 'LDX', 2, 3, addressingModes.zeroPage, instructionLDX));
        this.#instructionSet.set(0xB6, new Opcode(0xB6, 'LDX', 2, 4, addressingModes.zeroPageY, instructionLDX));
        this.#instructionSet.set(0xAE, new Opcode(0xAE, 'LDX', 3, 4, addressingModes.absolute, instructionLDX));
        this.#instructionSet.set(0xBE, new Opcode(0xBE, 'LDX', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionLDX));

        this.#instructionSet.set(0xA0, new Opcode(0xA0, 'LDY', 2, 2, addressingModes.immediate, instructionLDY));
        this.#instructionSet.set(0xA4, new Opcode(0xA4, 'LDY', 2, 3, addressingModes.zeroPage, instructionLDY));
        this.#instructionSet.set(0xB4, new Opcode(0xB4, 'LDY', 2, 4, addressingModes.zeroPageY, instructionLDY));
        this.#instructionSet.set(0xAC, new Opcode(0xAC, 'LDY', 3, 4, addressingModes.absolute, instructionLDY));
        this.#instructionSet.set(0xBC, new Opcode(0xBC, 'LDY', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionLDY));

        this.#instructionSet.set(0x4A, new Opcode(0x4A, 'LSR', 1, 2, addressingModes.accumulator, instructionLSR));
        this.#instructionSet.set(0x46, new Opcode(0x46, 'LSR', 2, 5, addressingModes.zeroPage, instructionLSR));
        this.#instructionSet.set(0x56, new Opcode(0x56, 'LSR', 2, 6, addressingModes.zeroPageX, instructionLSR));
        this.#instructionSet.set(0x4E, new Opcode(0x4E, 'LSR', 3, 6, addressingModes.absolute, instructionLSR));
        this.#instructionSet.set(0x5E, new Opcode(0x5E, 'LSR', 3, 7, addressingModes.absoluteX, instructionLSR));

        this.#instructionSet.set(0xEA, new Opcode(0xEA, 'NOP', 1, 2, addressingModes.none, instructionNOP));

        this.#instructionSet.set(0x09, new Opcode(0x09, 'ORA', 2, 2, addressingModes.immediate, instructionORA));
        this.#instructionSet.set(0x05, new Opcode(0x05, 'ORA', 2, 3, addressingModes.zeroPage, instructionORA));
        this.#instructionSet.set(0x15, new Opcode(0x15, 'ORA', 2, 4, addressingModes.zeroPageX, instructionORA));
        this.#instructionSet.set(0x0D, new Opcode(0x0D, 'ORA', 3, 4, addressingModes.absolute, instructionORA));
        this.#instructionSet.set(0x1D, new Opcode(0x1D, 'ORA', 3, 4/*+1 if page crossed*/, addressingModes.absoluteX, instructionORA));
        this.#instructionSet.set(0x19, new Opcode(0x19, 'ORA', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionORA));
        this.#instructionSet.set(0x01, new Opcode(0x01, 'ORA', 2, 6, addressingModes.indirectX, instructionORA));
        this.#instructionSet.set(0x11, new Opcode(0x11, 'ORA', 2, 5/*+1 if page crossed*/, addressingModes.indirectY, instructionORA));

        this.#instructionSet.set(0x48, new Opcode(0x48, 'PHA', 1, 3, addressingModes.none, instructionPHA));

        this.#instructionSet.set(0x08, new Opcode(0x08, 'PHP', 1, 3, addressingModes.none, instructionPHP));
        
        this.#instructionSet.set(0x68, new Opcode(0x68, 'PLA', 1, 4, addressingModes.none, instructionPLA));

        this.#instructionSet.set(0x28, new Opcode(0x28, 'PLP', 1, 4, addressingModes.none, instructionPLP));

        this.#instructionSet.set(0x2A, new Opcode(0x2A, 'ROL', 1, 2, addressingModes.accumulator, instructionROL));
        this.#instructionSet.set(0x26, new Opcode(0x26, 'ROL', 2, 5, addressingModes.zeroPage, instructionROL));
        this.#instructionSet.set(0x36, new Opcode(0x36, 'ROL', 2, 6, addressingModes.zeroPageX, instructionROL));
        this.#instructionSet.set(0x2E, new Opcode(0x2E, 'ROL', 3, 6, addressingModes.absolute, instructionROL));
        this.#instructionSet.set(0x3E, new Opcode(0x3E, 'ROL', 3, 7, addressingModes.absoluteX, instructionROL));

        this.#instructionSet.set(0x6A, new Opcode(0x6A, 'ROR', 1, 2, addressingModes.accumulator, instructionROR));
        this.#instructionSet.set(0x66, new Opcode(0x66, 'ROR', 2, 5, addressingModes.zeroPage, instructionROR));
        this.#instructionSet.set(0x76, new Opcode(0x76, 'ROR', 2, 6, addressingModes.zeroPageX, instructionROR));
        this.#instructionSet.set(0x6E, new Opcode(0x6E, 'ROR', 3, 6, addressingModes.absolute, instructionROR));
        this.#instructionSet.set(0x7E, new Opcode(0x7E, 'ROR', 3, 7, addressingModes.absoluteX, instructionROR));

        this.#instructionSet.set(0x40, new Opcode(0x40, 'RTI', 1, 6, addressingModes.none, instructionRTI));
        
        this.#instructionSet.set(0x60, new Opcode(0x60, 'RTS', 1, 6, addressingModes.none, instructionRTS));

        this.#instructionSet.set(0xE9, new Opcode(0xE9, 'SBC', 2, 2, addressingModes.immediate, instructionSBC));
        this.#instructionSet.set(0xE5, new Opcode(0xE5, 'SBC', 2, 3, addressingModes.zeroPage, instructionSBC));
        this.#instructionSet.set(0xF5, new Opcode(0xF5, 'SBC', 2, 4, addressingModes.zeroPageX, instructionSBC));
        this.#instructionSet.set(0xED, new Opcode(0xED, 'SBC', 3, 4, addressingModes.absolute, instructionSBC));
        this.#instructionSet.set(0xFD, new Opcode(0xFD, 'SBC', 3, 4, addressingModes.absoluteX, instructionSBC));
        this.#instructionSet.set(0xF9, new Opcode(0xF9, 'SBC', 3, 4, addressingModes.absoluteY, instructionSBC));
        this.#instructionSet.set(0xE1, new Opcode(0xE1, 'SBC', 2, 6, addressingModes.indirectX, instructionSBC));
        this.#instructionSet.set(0xF1, new Opcode(0xF1, 'SBC', 2, 5, addressingModes.indirectY, instructionSBC));

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

        this.#instructionSet.set(0x86, new Opcode(0x86, 'STX', 2, 3, addressingModes.zeroPage, instructionSTX));
        this.#instructionSet.set(0x96, new Opcode(0x96, 'STX', 2, 4, addressingModes.zeroPageY, instructionSTX));
        this.#instructionSet.set(0x8E, new Opcode(0x8E, 'STX', 3, 4, addressingModes.absolute, instructionSTX));

        this.#instructionSet.set(0x84, new Opcode(0x84, 'STY', 2, 3, addressingModes.zeroPage, instructionSTY));
        this.#instructionSet.set(0x94, new Opcode(0x94, 'STY', 2, 4, addressingModes.zeroPageX, instructionSTY));
        this.#instructionSet.set(0x8C, new Opcode(0x8C, 'STY', 3, 4, addressingModes.absolute, instructionSTY));

        this.#instructionSet.set(0xAA, new Opcode(0xAA, 'TAX', 1, 2, addressingModes.none, instructionTAX));
        this.#instructionSet.set(0xA8, new Opcode(0xA8, 'TAY', 1, 2, addressingModes.none, instructionTAY));
        this.#instructionSet.set(0xBA, new Opcode(0xBA, 'TSX', 1, 2, addressingModes.none, instructionTSX));
        this.#instructionSet.set(0x8A, new Opcode(0x8A, 'TXA', 1, 2, addressingModes.none, instructionTXA));
        this.#instructionSet.set(0x9A, new Opcode(0x9A, 'TXS', 1, 2, addressingModes.none, instructionTXS));
        this.#instructionSet.set(0x98, new Opcode(0x98, 'TYA', 1, 2, addressingModes.none, instructionTYA));
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
            const memoryValue = this.#memory.read(this.getProgramCounter());
            const operand = new Binary8(memoryValue + this.getRegisterX());

            return operand.get();
        }

        if (addressingMode === addressingModes.zeroPageY) {
            const memoryValue = this.#memory.read(this.getProgramCounter());
            const operand = new Binary8(memoryValue + this.getRegisterY());

            return operand.get();
        }

        if (addressingMode === addressingModes.absolute) {
            return this.#memory.readWord(this.getProgramCounter());
        }

        if (addressingMode === addressingModes.absoluteX) {
            const memoryValue = this.#memory.readWord(this.getProgramCounter());
            const operand = new Binary16(memoryValue + this.getRegisterX());

            return operand.get();
        }

        if (addressingMode === addressingModes.absoluteY) {
            const memoryValue = this.#memory.readWord(this.getProgramCounter());
            const operand = new Binary16(memoryValue + this.getRegisterY());

            return operand.get();
        }

        if (addressingMode === addressingModes.indirect) {
            const memoryAddress = this.#memory.readWord(this.getProgramCounter());
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

            return indirectAddress;
        }

        if (addressingMode === addressingModes.indirectX) {
            const memoryValue = this.#memory.read(this.getProgramCounter());
            const pointer = new Binary8(memoryValue + this.getRegisterX());

            return this.#memory.readWord(pointer.get());
        }

        if (addressingMode === addressingModes.indirectY) {
            const memoryValue = this.#memory.read(this.getProgramCounter());
            const pointer = new Binary8(memoryValue + this.getRegisterY());

            return this.#memory.readWord(pointer.get());
        }

        return null;
    }

    #instructionADC(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        let sum = this.getRegisterA() + memoryValue;

        if (this.isCarryFlagSet()) {
            sum += 1;
        }

        if (sum > 0xFF) {
            this.setCarryFlag();
        }

        const result = new Binary8(sum);

        this.#checkOverflowFlag(this.getRegisterA(), memoryValue, result.get());

        this.setRegisterA(result.get());

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionAND(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        this.setRegisterA(this.getRegisterA() & memoryValue);

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionASL(opcode) {
        let value;

        if (opcode.mode === addressingModes.accumulator) {
            value = this.getRegisterA();

            this.#checkCarryFlagBit7(value);

            this.setRegisterA(value << 1);

            value = this.getRegisterA();
        } else {
            const operandAddress = this.#getOperandAddress(opcode.mode);
            value = this.#memory.read(operandAddress);

            this.#checkCarryFlagBit7(value);

            this.#memory.write(operandAddress, value << 1);

            value = this.#memory.read(operandAddress);
        }

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
        this.setRegisterX(this.getRegisterX() - 1);

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
    }

    #instructionDEY() {
        this.setRegisterY(this.getRegisterY() - 1);

        this.#checkZeroFlag(this.getRegisterY());
        this.#checkNegativeFlag(this.getRegisterY());
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
        const operandAddress = this.#getOperandAddress(opcode.mode);
        this.setProgramCounter(operandAddress);
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
        let value;

        if (opcode.mode === addressingModes.accumulator) {
            value = this.getRegisterA();

            this.#checkCarryFlagBit0(value);

            this.setRegisterA(value >>> 1);

            value = this.getRegisterA();
        } else {
            const operandAddress = this.#getOperandAddress(opcode.mode);
            value = this.#memory.read(operandAddress);

            this.#checkCarryFlagBit0(value);

            this.#memory.write(operandAddress, value >>> 1);

            value = this.#memory.read(operandAddress);
        }

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionNOP() {
        return;
    }

    #instructionORA(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        this.setRegisterA(this.getRegisterA() | memoryValue);

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionPHA() {
        this.pushStack(this.getRegisterA());
    }

    #instructionPHP() {
        this.pushStack(this.getStatus());
    }

    #instructionPLA() {
        this.setRegisterA(this.popStack());

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionPLP() {
        this.setStatus(this.popStack());
    }

    #instructionROL(opcode) {
        let value;

        if (opcode.mode === addressingModes.accumulator) {
            value = this.getRegisterA();

            const isOldCarrySet = this.isCarryFlagSet();

            this.#checkCarryFlagBit7(value);

            value <<= 1;

            if (isOldCarrySet) {
                value |= 0x01;
            }

            this.setRegisterA(value);

            value = this.getRegisterA();
        } else {
            const operandAddress = this.#getOperandAddress(opcode.mode);
            value = this.#memory.read(operandAddress);

            const isOldCarrySet = this.isCarryFlagSet();

            this.#checkCarryFlagBit7(value);

            value <<= 1;

            if (isOldCarrySet) {
                value |= 0x01;
            }

            this.#memory.write(operandAddress, value);

            value = this.#memory.read(operandAddress);
        }

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionROR(opcode) {
        let value;

        if (opcode.mode === addressingModes.accumulator) {
            value = this.getRegisterA();

            const isOldCarrySet = this.isCarryFlagSet();

            this.#checkCarryFlagBit0(value);

            value >>>= 1;

            if (isOldCarrySet) {
                value |= 0b1000_0000;
            }

            this.setRegisterA(value);

            value = this.getRegisterA();
        } else {
            const operandAddress = this.#getOperandAddress(opcode.mode);
            value = this.#memory.read(operandAddress);

            const isOldCarrySet = this.isCarryFlagSet();

            this.#checkCarryFlagBit0(value);

            value >>>= 1;

            if (isOldCarrySet) {
                value |= 0b1000_0000;
            }

            this.#memory.write(operandAddress, value);

            value = this.#memory.read(operandAddress);
        }

        this.#checkZeroFlag(value);
        this.#checkNegativeFlag(value);
    }

    #instructionRTI() {
        this.setStatus(this.popStack());
        this.setProgramCounter(this.popWordStack());
    }

    #instructionRTS() {
        this.setProgramCounter(this.popWordStack() + 1);
    }

    #instructionSBC(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const memoryValue = this.#memory.read(operandAddress);

        let sum = this.getRegisterA() + twosComplement(memoryValue);

        if (this.isCarryFlagSet()) {
            sum += 1;
        }

        if (sum > 0xFF) {
            this.setCarryFlag();
        }

        const result = new Binary8(sum);

        this.#checkOverflowFlag(this.getRegisterA(), memoryValue, result.get());

        this.setRegisterA(result.get());

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
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

    #instructionTSX() {
        this.setRegisterX(this.popStack());

        this.#checkZeroFlag(this.setRegisterX());
        this.#checkNegativeFlag(this.setRegisterX());
    }

    #instructionTXA() {
        this.setRegisterA(this.getRegisterX());

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionTXS() {
        this.pushStack(this.getRegisterX());
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

    #checkCarryFlagBit7(value) {
        if ((value & 0b1000_0000) == 0b1000_0000) {
            this.setCarryFlag();
        } else {
            this.clearCarryFlag();
        }
    }

    #checkCarryFlagBit0(value) {
        if ((value & 0b0000_0001) == 0b0000_0001) {
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

    #checkOverflowFlag(operand1, operand2, result) {
        // If both terms have equal signs but the sum's sign is different, then overflow is set.
        // http://www.righto.com/2012/12/the-6502-overflow-flag-explained.html
        if (((result ^ operand1) & (result ^ operand2) & signBitMask) != 0) {
            this.setOverflowFlag();
        } else {
            this.clearOverflowFlag();
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
