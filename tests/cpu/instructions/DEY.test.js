import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('DEY-0x88: X > 0, R = 0', () => {
    let program = new Uint8Array([
        0x88,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    
    cpu.setRegisterY(0x01);

    nesConsole.start();

    expect(cpu.getRegisterY()).toBe(0x00);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.ZERO);
});
