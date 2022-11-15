import CPU from "../emulator/CPU.js";

test('LDA-0xA9', () => {
    const cpu = new CPU();

    let program = new Uint8Array([
        0xA9, 0xC0,
        0x00
    ]);

    cpu.interpret(program);

    expect(cpu.getRegisterA()).toBe(0xC0);
    expect(cpu.getStatus()).toBe(0b1000_0000);
});

test('INX-0xE8', () => {
    const cpu = new CPU();

    let program = new Uint8Array([
        0xE8,
        0xE8,
        0xE8,
        0x00
    ]);

    cpu.interpret(program);

    expect(cpu.getRegisterX()).toBe(3);
    expect(cpu.getStatus()).toBe(0b0000_0000);
});
