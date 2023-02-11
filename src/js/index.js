import Console from "../emulator/Console.js";
import Canvas from "./Canvas.js";

document.body.onload = () => {
    let program = new Uint8Array([
        0xE8,
        0x00
    ]);

    // const nesConsole = new Console(program);

    const canvasEl = document.getElementById('game-canvas');
    const view = new Canvas(canvasEl);
    view.draw();

    // nesConsole.start((cpu) => {

    // });
}
