export default class Opcode {
    constructor(code, mnemonic, length, cycles, mode, callback) {
        this.code = code;
        this.mnemonic = mnemonic;
        this.length = length;
        this.cycles = cycles;
        this.mode = mode;
        this.callback = callback;
    }

    execute() {
        this.callback(this);
    }
}
