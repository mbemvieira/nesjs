import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('BIT-0x24: all target status flags set', () => {
    let program = new Uint8Array([
        0x24, 0xA0, // zero page
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    cpu.setRegisterA(0b0000_0000);
    memory.write(0x00A0, 0b1111_1111);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE | mask.OVERFLOW | mask.ZERO);
});

test('BIT-0x2C: all target status flags unset', () => {
    let program = new Uint8Array([
        0x2C, 0xAC, 0x07, // absolute
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    cpu.setRegisterA(0b0000_0001);
    memory.write(0x07AC, 0b0011_1111);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET);
});

test('BIT-mix', () => {
    let program = new Uint8Array([
        0x24, 0xA0, // zero page
        0x2C, 0xAC, 0x07, // absolute
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    cpu.setRegisterA(0b0000_0000);
    memory.write(0x00A0, 0b1011_1111);
    memory.write(0x07AC, 0b0111_1111);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.OVERFLOW | mask.ZERO);
});
