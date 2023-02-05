import Console from "../../../src/emulator/Console.js";

test('JMP-0x4C: absolute', () => {
    let program = new Uint8Array([
        0x4C, 0x7F, 0x00, // go to 0x007F
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    // jump here
    memory.write(0x007F, 0x00);

    nesConsole.start();

    expect(cpu.getProgramCounter()).toBe(0x0080);
});

test('JMP-0x6C: indirect', () => {
    let program = new Uint8Array([
        0x6C, 0x00, 0x00, // go to 0x0000
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    // go to 0x7F
    memory.write(0x0000, 0x7F);
    memory.write(0x0001, 0x00);

    // jump here
    memory.write(0x007F, 0x00);

    nesConsole.start();

    expect(cpu.getProgramCounter()).toBe(0x0080);
});
