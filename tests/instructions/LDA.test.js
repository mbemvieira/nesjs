import Console from "../../emulator/Console.js";
import { statusMasks as mask } from "../../emulator/masks.js";

test('LDA-0xA9: load negative number', () => {
    let program = new Uint8Array([
        0xA9, 0xC0,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    nesConsole.start();

    expect(cpu.getRegisterA()).toBe(0xC0);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
