import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('INC-0xE6: negative flag', () => {
    let program = new Uint8Array([
        0xE6, 0x0C,
        0xE6, 0x0C,
        0xE6, 0x0C,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    memory.write(0x000C, 0x7D);

    nesConsole.start();

    expect(memory.read(0x000C)).toBe(0x80);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
