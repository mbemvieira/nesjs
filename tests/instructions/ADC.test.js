import Console from "../../emulator/Console.js";

test('ADC-0x69: immediate', () => {
    let program = new Uint8Array([
        0x69, 0xFF,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    nesConsole.start();

    expect(cpu.getRegisterA()).toBe(0xC0);
    expect(cpu.getStatus()).toBe(0b1010_0100);
});