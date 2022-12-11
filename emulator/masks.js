export const zeroBinary = 0b0000_0000;
export const signBitMask = 0b1000_0000;

export const statusMasks = {
    CARRY: 0b0000_0001,
    ZERO: 0b0000_0010,
    INTERRUPT: 0b0000_0100,
    DECIMAL: 0b0000_1000,
    BREAK: 0b0001_0000,
    EMPTY: 0b0010_0000,
    OVERFLOW: 0b0100_0000,
    NEGATIVE: 0b1000_0000,
};

export const statusUnsetMasks = {
    CARRY: 0b1111_1110,
    ZERO: 0b1111_1101,
    INTERRUPT: 0b1111_1011,
    DECIMAL: 0b1111_0111,
    BREAK: 0b1110_1111,
    EMPTY: 0b1101_1111,
    OVERFLOW: 0b1011_1111,
    NEGATIVE: 0b0111_1111,
};

export default {
    zeroBinary,
    signBitMask,
    statusMasks,
    statusUnsetMasks,
};
