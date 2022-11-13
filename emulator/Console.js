import CPU from "./CPU";
import RAM from "./RAM";

export default class Console {
    #cpu
    #ram

    constructor() {
        let ram = new RAM();
        this.#cpu = new CPU(ram);
        this.#ram = ram;
    }

    start() {
        this.#cpu.interpret();        
    }
}
