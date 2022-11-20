export default class Opcode {
    constructor(code, mnemonic, length, cycles, mode) {
        this.code = code;
        this.mnemonic = mnemonic;
        this.length = length;
        this.cycles = cycles;
        this.mode = mode;
    }
}
