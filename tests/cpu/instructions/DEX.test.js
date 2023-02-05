import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('DEX-0xCA: X = 0, R < 0', () => {
    let program = new Uint8Array([
        0xCA,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    
    cpu.setRegisterX(0x00);

    nesConsole.start();

    expect(cpu.getRegisterX()).toBe(0xFF);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
