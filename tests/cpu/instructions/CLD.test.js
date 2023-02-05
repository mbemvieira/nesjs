import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('CLD-0xD8', () => {
    let program = new Uint8Array([
        0xD8,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setStatus(cpu.STATUS_RESET | mask.DECIMAL);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET);
});
