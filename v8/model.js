// V8 engine: the model script for the blueprint engine, which v8/build.js inlines after the generated geometry.
// The engine runs on its own (not with reduced motion). Each frame the crank turns; every piston sits where its
// crank pin puts it (the slider-crank: s = r cos a + sqrt(l^2 - r^2 sin^2 a)), every con rod turns about its small
// end to reach its pin, and each cylinder's valves, lifters and pushrods follow its own four-stroke cycle. The
// cam, balancer, pulleys and flywheel turn with the crank.
(function () {
  "use strict";
  const G = window.V8_GEOMETRY;
  const DETAIL = {
    "Engine Block": ["Engine block", "One iron casting: two banks of four cylinders at 90 degrees, water jackets round them, and the crankcase below holding the crankshaft in five main bearings."],
    "Engine Mounts": ["Engine mounts", "Rubber-cushioned brackets that bolt the block to the car's frame and soak up its vibration."],
    "Oil Pan": ["Oil pan", "A pressed-steel sump under the crank holding the oil the pump sends round the engine."],
    "Left Cylinder Head": ["Cylinder head", "Seals the top of four cylinders and carries their valves, springs, rockers and spark plugs, with a port to each valve."],
    "Right Cylinder Head": ["Cylinder head", "Seals the top of four cylinders and carries their valves, springs, rockers and spark plugs, with a port to each valve."],
    "Left Valve Cover": ["Valve cover", "A chromed lid over the rockers and springs that keeps the oil in; the left one carries the filler cap."],
    "Right Valve Cover": ["Valve cover", "A chromed lid over the rockers and springs that keeps the oil in; the right one carries the breather."],
    "Left Valve Springs": ["Valve springs", "A coil spring round each valve stem snaps the valve shut once the cam lobe has passed."],
    "Right Valve Springs": ["Valve springs", "A coil spring round each valve stem snaps the valve shut once the cam lobe has passed."],
    "Left Rocker Arms": ["Rocker arms", "Each rocks on a stud: the pushrod lifts one end and the other end pushes its valve open."],
    "Right Rocker Arms": ["Rocker arms", "Each rocks on a stud: the pushrod lifts one end and the other end pushes its valve open."],
    "Crankshaft": ["Crankshaft", "Forged steel, with four pins at 90 degrees to each other (a cross-plane crank) and counterweights opposite each. Two rods share each pin."],
    "Camshaft": ["Camshaft", "Sixteen lobes, one per valve, in the valley between the banks. A gear drives it from the crank at half speed."],
    "Intake Manifold": ["Intake manifold", "Carries the fuel and air mixture from the carburettor down eight runners to the intake ports."],
    "Carburettor": ["Carburettor", "Four barrels: two small ones for cruising and two that open at full throttle. Air rushing through them draws in fuel."],
    "Air Cleaner": ["Air cleaner", "A round paper filter under a lid held by one wing nut, cleaning every bit of air the engine breathes."],
    "Distributor": ["Distributor", "Driven by the cam, it times the spark and its rotor sends it to each cylinder's wire in firing order."],
    "Plug Wires": ["Spark plug wires", "Insulated leads from the distributor cap to each spark plug, with a rubber boot over the plug."],
    "Left Header": ["Exhaust header", "Four tuned tubes from one bank's exhaust ports, merging into a single collector."],
    "Right Header": ["Exhaust header", "Four tuned tubes from one bank's exhaust ports, merging into a single collector."],
    "Timing Cover": ["Timing cover", "Covers the gears and chain that drive the camshaft from the crank."],
    "Water Pump": ["Water pump", "Belt-driven, it pushes coolant through the block and heads to the radiator."],
    "Water Pump Pulley": ["Water pump pulley", "Turned by the belt from the crank."],
    "Harmonic Balancer": ["Harmonic balancer", "A heavy ring on rubber at the crank's nose that damps its twisting, and drives the belt."],
    "Alternator": ["Alternator", "Makes the electricity that charges the battery and runs the ignition."],
    "Alternator Pulley": ["Alternator pulley", "Small, so the alternator spins about three times as fast as the crank."],
    "Drive Belt": ["Drive belt", "One belt from the crank to the water pump and the alternator."],
    "Flywheel": ["Flywheel", "A heavy disc at the back that smooths the firing pulses; the starter's gear meshes with the teeth round its rim."],
    "Starter Motor": ["Starter motor", "Turns the flywheel to start the engine, then pulls its gear back out."],
    "Oil Filter": ["Oil filter and dipstick", "The oil passes through the filter on its way round; the dipstick shows how much is in the pan."],
  };
  G.objects.forEach(o => {
    if (/^Piston/.test(o.name)) DETAIL[o.name] = ["Piston", "Aluminium, with three rings that seal it in the bore. The burning mixture pushes it down."];
    if (/^Con Rod/.test(o.name)) DETAIL[o.name] = ["Con rod", "Connects a piston's wrist pin to its crank pin, turning the piston's up-and-down into rotation."];
    if (/Valve \d/.test(o.name)) DETAIL[o.name] = [/^Intake/.test(o.name) ? "Intake valve" : "Exhaust valve", "Opened by its rocker, closed by its spring, sealing the port against its seat in the head."];
    if (/^Pushrod/.test(o.name)) DETAIL[o.name] = ["Lifter and pushrod", "The lifter rides on its cam lobe; the pushrod carries the lift up to the rocker."];
  });

  window.BLUEPRINT_MODEL = {
    geometry: G,
    themeKey: "v8-theme",
    touchHint: "Tap the engine to take it apart",
    view: { az: 40, el: 24, fit: 1.05 },
    spoolOf: o => o.spool || null,
    occluders: ["Engine Block", "Oil Pan", "Left Cylinder Head", "Right Cylinder Head", "Left Valve Cover", "Right Valve Cover", "Intake Manifold", "Air Cleaner", "Timing Cover"],
    hotspots: G.hotspots.map(h => ({ t: h.t, s: h.s, p: h.p, o: h.o })),
    detail: DETAIL,
    tour: G.tour,
    // shaded and photo styles: orange block and heads, chrome covers and air cleaner, steel headers
    materials: [
      [/Engine Block|Cylinder Head|Intake Manifold|Timing Cover|Water Pump$/, ["paint", { color: 0xd0581f, roughness: 0.45 }]],
      [/Valve Cover|Air Cleaner/, ["nickel", { roughness: 0.12 }]], [/Oil Pan/, ["paint", { color: 0x1d1e20 }]],
      [/Header/, ["steel", { color: 0x8b8e93, roughness: 0.42 }]], [/Carburettor|Distributor/, ["alu", { color: 0xb9b4a8 }]],
      [/Plug Wires|Drive Belt/, "rubber"], [/Crankshaft|Camshaft|Con Rod|Flywheel|Balancer|Pulley/, "steel"],
      [/Piston/, "alu"], [/Valve \d|Pushrod|Springs|Rocker/, "steel"], [/Alternator$|Starter/, ["darkAlu", { color: 0x55595f }]],
      [/Oil Filter/, ["paint", { color: 0x1a4fa0 }]], [/Mounts/, "rubber"],
    ],

    setup(E) {
      const sp = n => (E.spinners[n] || [])[0];
      const { R, ROD, TDC } = G.constants;
      const AXLE = new THREE.Vector3(0, 0, -1);   // the crank's axis (Blender +Y) in three's frame
      const cyl = G.cylinders.map((c, i) => ({ ...c, piston: sp(G.pistons[i].spool), rod: sp(G.rods[i].spool),
        dir: new THREE.Vector3(Math.sin(c.beta), Math.cos(c.beta), 0), off: [0, 2, 2, 0, 0, 2, 2, 0][i] * Math.PI }));
      const valves = G.valves.map(v => ({ ...v, g: sp(v.spool), push: sp(v.pushrod.spool),
        open: new THREE.Vector3(-v.axis[0], -v.axis[2], v.axis[1]), lift: new THREE.Vector3(v.pushrod.dir[0], v.pushrod.dir[2], -v.pushrod.dir[1]) }));
      const spin = { crank: 1, cam: 0.5, balancer: 1, flywheel: 1, pump: 1.3, alt: 2.9 };
      const q = new THREE.Quaternion();
      const ang = (x, z) => Math.atan2(x, z);
      const TAU = Math.PI * 2, L = 9;
      // a valve's lift through its cylinder's 720-degree cycle (0 = top dead centre before intake)
      const bump = (phi, start, dur) => { const t = ((phi - start) % (2 * TAU) + 2 * TAU) % (2 * TAU); return t < dur ? Math.sin(Math.PI * t / dur) ** 2 : 0; };
      let theta = 0;
      return {
        tick(now, dt) {
          if (!E.reduceMotion) theta += 4.2 * dt;
          Object.entries(spin).forEach(([k, s]) => { const g = sp(k); if (g) g.quaternion.setFromAxisAngle(AXLE, theta * s); });
          cyl.forEach(c => {
            const a = theta + c.psi - c.beta;
            const s = R * Math.cos(a) + Math.sqrt(ROD * ROD - R * R * Math.sin(a) ** 2);
            if (c.piston) c.piston.position.copy(c.dir).multiplyScalar(s - TDC);
            if (c.rod) {
              // small end on the piston pin, big end on the crank pin
              const pin = [R * Math.sin(theta + c.psi), R * Math.cos(theta + c.psi)], wrist = [s * Math.sin(c.beta), s * Math.cos(c.beta)];
              const phi = ang(pin[0] - wrist[0], pin[1] - wrist[1]) - ang(-Math.sin(c.beta), -Math.cos(c.beta));
              c.rod.position.copy(c.dir).multiplyScalar(s - TDC);
              c.rod.quaternion.setFromAxisAngle(AXLE, phi);
            }
            c.cycle = a + c.off;
          });
          valves.forEach(v => {
            const phi = cyl[v.cyl].cycle;
            const h = L * (v.kind === "I" ? bump(phi, -0.15, Math.PI + 0.65) : bump(phi, 3 * Math.PI - 0.5, Math.PI + 0.65));
            if (v.g) v.g.position.copy(v.open).multiplyScalar(h);
            if (v.push) v.push.position.copy(v.lift).multiplyScalar(h / 1.5);
          });
        },
      };
    },
  };
})();
