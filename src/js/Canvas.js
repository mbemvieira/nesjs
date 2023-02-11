import * as colors from "./colors.js";

export default class Canvas {
    WIDTH = 32;
    HEIGHT = 32;
    SCALE = 10;

    #canvasEl;
    #screenState;

    constructor(canvasEl) {
        this.#canvasEl = canvasEl;

        this.#canvasEl.width = this.WIDTH * this.SCALE;
        this.#canvasEl.height = this.HEIGHT * this.SCALE;
    }

    draw() {
        const ctx = this.#canvasEl.getContext("2d");

        ctx.fillStyle = "green";
        ctx.fillRect(10, 10, 10, 10);
    }

    #color(byte) {
        if (byte === 0) {
            return colors.BLACK;
        }

        if (byte === 1) {
            return colors.WHITE;
        }

        return colors.RED;
    }

    #needUpdate() {
        return true;
    }
}

// fn color(byte: u8) -> Color {
//     match byte {
//         0 => sdl2::pixels::Color::BLACK,
//         1 => sdl2::pixels::Color::WHITE,
//         2 | 9 => sdl2::pixels::Color::GREY,
//         3 | 10 => sdl2::pixels::Color::RED,
//         4 | 11 => sdl2::pixels::Color::GREEN,
//         5 | 12 => sdl2::pixels::Color::BLUE,
//         6 | 13 => sdl2::pixels::Color::MAGENTA,
//         7 | 14 => sdl2::pixels::Color::YELLOW,
//         _ => sdl2::pixels::Color::CYAN,
//     }
// }

// fn read_screen_state(cpu: &CPU, frame: &mut [u8; 32 * 3 * 32]) -> bool {
//     let mut frame_idx = 0;
//     let mut update = false;
//     for i in 0x0200..0x600 {
//         let color_idx = cpu.mem_read(i as u16);
//         let (b1, b2, b3) = color(color_idx).rgb();
//         if frame[frame_idx] != b1 || frame[frame_idx + 1] != b2 || frame[frame_idx + 2] != b3 {
//             frame[frame_idx] = b1;
//             frame[frame_idx + 1] = b2;
//             frame[frame_idx + 2] = b3;
//             update = true;
//         }
//         frame_idx += 3;
//     }
//     update
// }
