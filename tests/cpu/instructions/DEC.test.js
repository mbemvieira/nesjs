import Console from "../../../emulator/Console.js";

test('DEC-0xC6: M > 0, R > 0', () => {
    let program = new Uint8Array([
        0xC6, 0x0C,
        0xC6, 0x0C,
        0xC6, 0x0C,
        0xC6, 0x0C,
        0xC6, 0x0C,
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    memory.write(0x000C, 0x10);

    nesConsole.start();

    expect(memory.read(0x000C)).toBe(0x0B);
    expect(cpu.getStatus()).toBe(cpu.STATUS_RESET);
});
