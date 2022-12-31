import Console from "../../../emulator/Console.js";
import { statusMasks as mask } from "../../../emulator/masks.js";

test('SEC-0x38', () => {
    let program = new Uint8Array([
        0x38,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setStatus(cpu.STATUS_RESET);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.CARRY);
});
