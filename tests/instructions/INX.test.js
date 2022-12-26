import Console from "../../emulator/Console.js";

test('INX-0xE8: increment multiple times', () => {
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
    expect(cpu.getStatus()).toBe(0b0010_0100);
});

test('INX-0xE8: overflow and zero flag', () => {
    let program = new Uint8Array([
        0xE8,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    cpu.setRegisterX(0xFF);
    nesConsole.start();

    expect(cpu.getRegisterX()).toBe(0x00);
    expect(cpu.getStatus()).toBe(0b0010_0110);
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
    expect(cpu.getStatus()).toBe(0b1010_0100);
});
