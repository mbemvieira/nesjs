import Console from "../emulator/Console.js";
import View from "./View.js";

let program = new Uint8Array([
    0xE8,
    0x00
]);

// const nesConsole = new Console(program);

const containerEl = document.getElementById('container');
const view = new View(containerEl);

// nesConsole.start((cpu) => {

// });
