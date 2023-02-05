import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('CPY-0xC0: Y > M', () => {
    let program = new Uint8Array([
        0xC0, 0x0F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterY(0x7F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.CARRY);
});

test('CPY-0xC0: Y = M', () => {
    let program = new Uint8Array([
        0xC0, 0x0F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterY(0x0F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.ZERO | mask.CARRY);
});

test('CPY-0xC0: Y < M', () => {
    let program = new Uint8Array([
        0xC0, 0x7F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterY(0x0F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
