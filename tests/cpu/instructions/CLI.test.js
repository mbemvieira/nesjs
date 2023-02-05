import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('CLI-0x58', () => {
    let program = new Uint8Array([
        0x58,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setStatus(cpu.STATUS_RESET | mask.INTERRUPT);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(mask.EMPTY);
});
