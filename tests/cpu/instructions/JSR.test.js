import Console from "../../../src/emulator/Console.js";

test('JSR-0x20: absolute', () => {
    let program = new Uint8Array([
        0x20, 0x7F, 0x00, // go to 0x007F
        0x00
    ]);

    const nesConsole = new Console(program);
    const cpu = nesConsole.getCPU();
    const memory = nesConsole.getMemory();

    // jump here
    memory.write(0x007F, 0x00);

    nesConsole.start();

    expect(cpu.getProgramCounter()).toBe(0x0080);
    expect(cpu.getStackPointer()).toBe(cpu.STACK_RESET - 2);

    const pc = cpu.popWordStack();

    expect(cpu.getStackPointer()).toBe(cpu.STACK_RESET);
    expect(pc).toBe(nesConsole.PC_START + 2);
});
