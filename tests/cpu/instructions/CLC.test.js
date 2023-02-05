import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('CLC-0x18', () => {
    let program = new Uint8Array([
        0x18,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setStatus(cpu.STATUS_RESET | mask.CARRY);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET);
});
