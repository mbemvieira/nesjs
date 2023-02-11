// fn handle_user_input(cpu: &mut CPU, event_pump: &mut EventPump) {
//     for event in event_pump.poll_iter() {
//         match event {
//             Event::Quit { .. } | Event::KeyDown { keycode: Some(Keycode::Escape), .. } => {
//                 std::process::exit(0)
//             },
//             Event::KeyDown { keycode: Some(Keycode::W), .. } => {
//                 cpu.mem_write(0xff, 0x77);
//             },
//             Event::KeyDown { keycode: Some(Keycode::S), .. } => {
//                 cpu.mem_write(0xff, 0x73);
//             },
//             Event::KeyDown { keycode: Some(Keycode::A), .. } => {
//                 cpu.mem_write(0xff, 0x61);
//             },
//             Event::KeyDown { keycode: Some(Keycode::D), .. } => {
//                 cpu.mem_write(0xff, 0x64);
//             }
//             _ => {/* do nothing */}
//         }
//     }
// }