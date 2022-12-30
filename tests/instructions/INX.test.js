import Console from "../../emulator/Console.js";
import { statusMasks as mask } from "../../emulator/masks.js";

test('INX-0xE8: multiple increments', () => {
    let program = new Uint8Array([
        0xE8,
        0xE8,
        0xE8,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    nesConsole.start();

    expect(cpu.getRegisterX()).toBe(0x03);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET);
});

test('INX-0xE8: zero', () => {
    let program = new Uint8Array([
        0xE8,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterX(0xFF);
    nesConsole.start();

    expect(cpu.getRegisterX()).toBe(0x00);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.ZERO);
});

test('INX-0xE8: negative flag', () => {
    let program = new Uint8Array([
        0xE8,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterX(0x7F);
    nesConsole.start();

    expect(cpu.getRegisterX()).toBe(0x80);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
