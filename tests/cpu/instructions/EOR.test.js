import Console from "../../../src/emulator/Console.js";
import { statusMasks as mask } from "../../../src/emulator/masks.js";

test('EOR-0x49: Alternate bits', () => {
    let program = new Uint8Array([
        0x49, 0b1111_0000,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterA(0b0000_1111);

    nesConsole.start();

    expect(cpu.getRegisterA()).toBe(0b1111_1111);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.NEGATIVE);
});

test('EOR-0x49: A = M', () => {
    let program = new Uint8Array([
        0x49, 0b1111_0000,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterA(0b1111_0000);

    nesConsole.start();

    expect(cpu.getRegisterA()).toBe(0b0000_0000);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET | mask.ZERO);
});
