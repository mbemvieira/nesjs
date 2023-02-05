import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('INY-0xC8: multiple increments, negative flag', () => {
    let program = new Uint8Array([
        0xC8,
        0xC8,
        0xC8,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterY(0x7D);

    nesConsole.start();

    expect(cpu.getRegisterY()).toBe(0x80);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
