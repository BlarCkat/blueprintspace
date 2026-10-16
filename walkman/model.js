// Sony Walkman TPS-L2: the model script for the blueprint engine, which walkman/build.js inlines after the generated
// geometry. It plays all the time (not with reduced motion): the motor turns the flywheel through the belt, the
// capstan and pinch roller pull the tape past the head, and the two reels turn at speeds set by how much tape
// each holds (slowed down so you can follow it).
(function () {
  "use strict";
  const G = window.WM_GEOMETRY;
  const DETAIL = {
    "Lower Case": ["Case", "Die-cast and anodised blue-silver aluminium, with the battery compartment at the right-hand end."],
    "Battery Door": ["Battery door", "Slides off underneath to change the two AA cells."],
    "Top Cover": ["Top cover and door", "The door over the cassette opens with the stop/eject key; its window shows the tape turning."],
    "Cassette Window": ["Window", "A clear panel in the door, so you can see how much tape is left."],
    "Badge": ["Badges", "The WALKMAN plate across the door and the stereo badge at the end."],
    "Hotline Button": ["HOTLINE button", "Hold it and the built-in microphone talks over the music, so two listeners can chat without taking off their headphones."],
    "Door Hinge": ["Door hinge", "A spring-loaded pin along the back edge pops the door up when you eject."],
    "Keys": ["Keys", "Stop/eject, rewind, fast-forward and play: mechanical keys that latch the transport into each mode. Play is pressed."],
    "Jacks and Volume": ["Jacks and volume", "Two 3.5 mm headphone jacks, A and B, each with its own volume slider, so two people can listen."],
    "Cassette": ["Compact cassette", "Two reels of 3.81 mm tape in a plastic shell, played one side at a time."],
    "Tape": ["Tape", "Plastic film coated with iron oxide. The music is stored as patterns of magnetism in two tracks for stereo."],
    "Supply Reel": ["Supply reel", "The tape unwinds from here. It turns slowly while it's full and faster as it empties."],
    "Take-up Reel": ["Take-up reel", "Winds the played tape in, starting fast and slowing as it fills."],
    "Chassis Plate": ["Transport chassis", "The steel plate the head, spindles, capstan and motor are mounted on."],
    "Playback Head": ["Playback head", "A stereo head on a sliding plate, pushed against the tape in play. Two coils pick up the magnetism passing its gap. Tape guides either side keep the tape aligned."],
    "Supply Spindle": ["Supply spindle", "Keys on it catch the supply reel's hub; a light brake keeps the tape taut."],
    "Take-up Spindle": ["Take-up spindle", "Driven through a slipping clutch, so it winds the tape in without pulling it."],
    "Pinch Roller": ["Pinch roller", "A rubber roller on a sprung arm that presses the tape against the capstan."],
    "Pinch Arm": ["Pinch arm", "Swings the pinch roller in when play is pressed."],
    "Capstan and Flywheel": ["Capstan and flywheel", "A polished shaft that sets the tape speed, on a heavy flywheel that keeps it steady."],
    "Motor": ["Motor", "A small DC motor with an electronic governor that holds its speed as the batteries run down."],
    "Motor Pulley": ["Motor pulley", "Small, so the flywheel turns much slower than the motor."],
    "Belt": ["Belt", "A thin rubber belt from the motor pulley round the flywheel."],
    "Amplifier Board": ["Amplifier board", "A preamplifier for the head and a headphone amplifier, plus the HOTLINE microphone circuit."],
    "AA Batteries": ["Batteries", "Two AA cells, about 8 hours of play."],
  };

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "wm-theme",
    touchHint: "Tap the Walkman to take it apart",
    view: { az: 35, el: 34, fit: 0.9 },
    spoolOf: o => o.spool || null,
    occluders: ["Lower Case", "Top Cover", "Cassette Window", "Cassette", "Chassis Plate"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    materials: [
      [/Lower Case|Top Cover|Door Hinge/, ["alu", { color: 0x5a7bb5, roughness: 0.35 }]],
      [/Badge|Keys|Jacks/, ["alu", { color: 0xc9ccd1, roughness: 0.25 }]], [/Hotline/, ["plastic", { color: 0xf07a1a, roughness: 0.4 }]],
      [/Cassette Window/, "clearGlass"], [/^Cassette$/, ["plastic", { color: 0xe9e6dc, roughness: 0.5 }]],
      [/Tape|Reel/, ["plastic", { color: 0x4a3426, roughness: 0.3 }]], [/Chassis Plate|Spindle|Pinch Arm|Capstan/, "steel"],
      [/Pinch Roller|Belt/, "rubber"], [/Playback Head/, "nickel"], [/^Motor$|Pulley/, ["darkAlu", { color: 0x55595f }]],
      [/Amplifier/, "pcb"], [/Batteries/, "battery"], [/Battery Door/, "alu"],
    ],

    setup(E) {
      const C = G.constants, V = 20;   // the tape's speed on screen, mm/s (the real one is 47.6)
      const UP = new THREE.Vector3(0, 1, 0);
      const w = { capstan: -V / 1, pinch: V / 4, supply: V / C.SUP_R, takeup: V / C.TAK_R, spindleL: V / C.SUP_R, spindleR: V / C.TAK_R, pulley: -V * 0.9 };
      let t = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) t += dt;
          Object.entries(w).forEach(([k, s]) => (E.spinners[k] || []).forEach(g => g.quaternion.setFromAxisAngle(UP, s * t)));
        },
      };
    },
  };
})();
