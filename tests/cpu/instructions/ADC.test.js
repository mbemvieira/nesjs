import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('ADC-0x69: A > 0, M > 0, C = 0, R < 0', () => {
    let program = new Uint8Array([
        0x69, 0x7F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterA(0x7F);

    nesConsole.start();

    expect(cpu.getRegisterA()).toBe(0xFE);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE | mask.OVERFLOW);
});
