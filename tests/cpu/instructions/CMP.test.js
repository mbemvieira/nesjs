import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('CMP-0xC9: A > M', () => {
    let program = new Uint8Array([
        0xC9, 0x0F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterA(0x7F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.CARRY);
});

test('CMP-0xC9: A = M', () => {
    let program = new Uint8Array([
        0xC9, 0x0F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterA(0x0F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.ZERO | mask.CARRY);
});

test('CMP-0xC9: A < M', () => {
    let program = new Uint8Array([
        0xC9, 0x7F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterA(0x0F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
