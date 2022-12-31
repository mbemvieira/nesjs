import Console from "../../../emulator/Console.js";
import { statusMasks as mask, statusUnsetMasks as clearMask } from "../../../emulator/masks.js";

test('SEI-0x78', () => {
    let program = new Uint8Array([
        0x78,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setStatus(cpu.STATUS_RESET & clearMask.INTERRUPT);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.INTERRUPT);
});
