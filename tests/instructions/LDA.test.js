import Console from "../../emulator/Console.js";

test('LDA-0xA9', () => {
    let program = new Uint8Array([
        0xA9, 0xC0,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();

    nesConsole.start();

    expect(cpu.getRegisterA()).toBe(0xC0);
    expect(cpu.getStatus()).toBe(0b1010_0100);
});
