import Console from "../../emulator/Console.js";
import { statusMasks as mask } from "../../emulator/masks.js";

test('CPX-0xE0: X > M', () => {
    let program = new Uint8Array([
        0xE0, 0x0F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterX(0x7F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.CARRY);
});

test('CPX-0xE0: X = M', () => {
    let program = new Uint8Array([
        0xE0, 0x0F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterX(0x0F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.ZERO | mask.CARRY);
});

test('CPX-0xE0: X < M', () => {
    let program = new Uint8Array([
        0xE0, 0x7F,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterX(0x0F);

    nesConsole.start();

    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});
