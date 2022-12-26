import Opcode from "./Opcode.js";
import addressingModes from "./addressingModes.js";
import { signBitMask, statusMasks, statusUnsetMasks } from "./masks.js";

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

    setStatus(value) {
        this.#status.setUint8(0, value);
    }

    setCarryFlag() {
        this.setStatus(this.getStatus() | statusMasks.CARRY);
    }

    unsetCarryFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.CARRY);
    }

    setZeroFlag() {
        this.setStatus(this.getStatus() | statusMasks.ZERO);
    }

    unsetZeroFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.ZERO);
    }

    setOverflowFlag() {
        this.setStatus(this.getStatus() | statusMasks.OVERFLOW);
    }

    unsetOverflowFlag() {
        this.setStatus(this.getStatus() & statusUnsetMasks.OVERFLOW);
    }

    setNegativeFlag() {
        this.setStatus(this.getStatus() | statusMasks.NEGATIVE);
    }

    unsetNegativeFlag() {
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
        const instructionBMI = (opcode) => this.#instructionBMI.call(this, opcode);
        const instructionBNE = (opcode) => this.#instructionBNE.call(this, opcode);
        const instructionBPL = (opcode) => this.#instructionBPL.call(this, opcode);
        const instructionBRK = () => this.#instructionBRK.call(this);
        const instructionBVC = (opcode) => this.#instructionBVC.call(this, opcode);
        const instructionBVS = (opcode) => this.#instructionBVS.call(this, opcode);
        const instructionINX = () => this.#instructionINX.call(this);
        const instructionLDA = (opcode) => this.#instructionLDA.call(this, opcode);
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
        this.#instructionSet.set(0x30, new Opcode(0x30, 'BMI', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBMI));
        this.#instructionSet.set(0xD0, new Opcode(0xD0, 'BNE', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBNE));
        this.#instructionSet.set(0x10, new Opcode(0x10, 'BPL', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBPL));

        this.#instructionSet.set(0x00, new Opcode(0x00, 'BRK', 1, 7, addressingModes.none, instructionBRK));

        this.#instructionSet.set(0x50, new Opcode(0x50, 'BVC', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBVC));
        this.#instructionSet.set(0x70, new Opcode(0x70, 'BVS', 2, 2/*+1 if branch succeeds,+2 if to a new page*/, addressingModes.relative, instructionBVS));

        this.#instructionSet.set(0xE8, new Opcode(0xE8, 'INX', 1, 2, addressingModes.none, instructionINX));

        this.#instructionSet.set(0xA9, new Opcode(0xA9, 'LDA', 2, 2, addressingModes.immediate, instructionLDA));
        this.#instructionSet.set(0xA5, new Opcode(0xA5, 'LDA', 2, 3, addressingModes.zeroPage, instructionLDA));
        this.#instructionSet.set(0xB5, new Opcode(0xB5, 'LDA', 2, 4, addressingModes.zeroPageX, instructionLDA));
        this.#instructionSet.set(0xAD, new Opcode(0xAD, 'LDA', 3, 4, addressingModes.absolute, instructionLDA));
        this.#instructionSet.set(0xBD, new Opcode(0xBD, 'LDA', 3, 4/*+1 if page crossed*/, addressingModes.absoluteX, instructionLDA));
        this.#instructionSet.set(0xB9, new Opcode(0xB9, 'LDA', 3, 4/*+1 if page crossed*/, addressingModes.absoluteY, instructionLDA));
        this.#instructionSet.set(0xA1, new Opcode(0xA1, 'LDA', 2, 6, addressingModes.indirectX, instructionLDA));
        this.#instructionSet.set(0xB1, new Opcode(0xB1, 'LDA', 2, 5/*+1 if page crossed*/, addressingModes.indirectY, instructionLDA));

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

        // If both terms have equal signs but the sum has a different sign, then overflow is set.
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
            this.unsetOverflowFlag();
        }

        this.setRegisterA(result.getUint8(0));

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
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
        // TODO
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

    #instructionCLC(opcode) {
        // TODO
    }

    #instructionCLD(opcode) {
        // TODO
    }

    #instructionCLI(opcode) {
        // TODO
    }

    #instructionCLV(opcode) {
        // TODO
    }

    #instructionCMP(opcode) {
        // TODO
    }

    #instructionCPX(opcode) {
        // TODO
    }

    #instructionCPY(opcode) {
        // TODO
    }

    #instructionDEC(opcode) {
        // TODO
    }

    #instructionDEX(opcode) {
        // TODO
    }

    #instructionDEY(opcode) {
        // TODO
    }

    #instructionEOR(opcode) {
        // TODO
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
        // TODO
    }

    #instructionJSR(opcode) {
        // TODO
    }

    #instructionLDA(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const value = this.#memory.read(operandAddress);

        this.setRegisterA(value);

        this.#checkZeroFlag(this.getRegisterA());
        this.#checkNegativeFlag(this.getRegisterA());
    }

    #instructionLDX(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const value = this.#memory.read(operandAddress);

        this.setRegisterX(value);

        this.#checkZeroFlag(this.getRegisterX());
        this.#checkNegativeFlag(this.getRegisterX());
    }

    #instructionLDY(opcode) {
        const operandAddress = this.#getOperandAddress(opcode.mode);
        const value = this.#memory.read(operandAddress);

        this.setRegisterY(value);

        this.#checkZeroFlag(this.getRegisterY());
        this.#checkNegativeFlag(this.getRegisterY());
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

    #instructionSEC(opcode) {
        // TODO
    }

    #instructionSED(opcode) {
        // TODO
    }

    #instructionSEI(opcode) {
        // TODO
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
            this.unsetCarryFlag();
        }
    }

    #checkZeroFlag(value) {
        if (value === 0) {
            this.setZeroFlag();
        } else {
            this.unsetZeroFlag();
        }
    }

    #checkNegativeFlag(value) {
        // Check sign bit. if 1 then negative else positive
        if ((value & signBitMask) === 0) {
            this.unsetNegativeFlag();
        } else {
            this.setNegativeFlag();
        }
    }
}
