export default class Memory {
    #memory;

    constructor(size) {
        if (!Number.isInteger(size) || size <= 0) {
            throw '[Memory::class] Bad constructor parameters';
        }

        this.#memory = new DataView(new ArrayBuffer(size));
    }

    read(address) {
        if (!this.#isValidAddress(address)) {
            return null;
        }

        return this.#memory.getUint8(address);
    }

    readWord(address) {
        let lo = this.read(address);
        let hi = this.read(address + 1);

        if (lo === null || hi === null) {
            return null;
        }

        return (hi << 8) | (lo);
    }

    readRange(startAddress, endAddress) {
        if (startAddress > endAddress) {
            return null;
        }

        const buffer = [];

        for (let i = startAddress; i <= endAddress; i++) {
            const byte = this.read(i);

            if (byte === null) {
                break;
            }

            buffer.push(byte);
        }

        return buffer;
    }

    write(address, value) {
        if (!this.#isValidAddress(address)) {
            return false;
        }

        this.#memory.setUint8(address, value);
        return true;
    }

    writeWord(address, value) {
        let hi = value >> 8;
        let lo = value & 0xFF;

        return this.write(address, lo) && this.write(address + 1, hi);
    }

    copy(originArray, start) {
        const values = originArray.values();
        let current = start;

        for (const value of values) {
            if (!this.write(current, value)) {
                break;
            }

            current += 1;
        }
    }

    #isValidAddress(address) {
        return (
            Number.isInteger(address) &&
            address >= 0 &&
            address < this.#memory.byteLength
        );
    }
}
