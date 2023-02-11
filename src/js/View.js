export default class View {
    WIDTH = 32;
    HEIGHT = 32;
    SCALE = 10;

    #app;
    #screenState;

    constructor(containerEl) {
        
    }

    start() {
        
    }

    #color(byte) {
        switch (byte) {
            case 0:
                
                break;
        
            default:
                break;
        }
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
