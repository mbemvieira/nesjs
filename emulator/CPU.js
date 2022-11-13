export default class CPU {
    ram;
    #registerA;
    #status;
    #programCounter;

    constructor(ram) {
        this.ram = ram;
        this.#registerA = new Uint8Array(1);
        this.#status = new Uint8Array(1);
        this.#programCounter = new Uint16Array(1);
    }

    interpret() {
        while(1) {
            
        }
    }
}
