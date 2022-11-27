import Console from "./Console.js";

let program = new Uint8Array([
    0xE8,
    0x00
]);

const nesConsole = new Console(program);

nesConsole.start();
