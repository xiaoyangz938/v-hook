# V-Hook

*Converted from `uist26a-sub6123-i7.pdf` and adapted for web reading.*

## Abstract

Vibration is a lightweight and widely available actuation source, but many vibration-driven locomotion systems still depend on specialized mechanisms, added electronics, or extensive empirical tuning. V-Hook proposes a morphology-driven alternative: encode motion behavior directly into 3D-printed hook structures fabricated with standard FDM printing.

By leveraging asymmetric contact and stick-slip interactions between hooks and the support surface, V-Hook turns a uniform vibration input into distinguishable motion outputs. The paper systematically studies how hook morphology, density, length, and vibration conditions influence motion accuracy, stability, and load-bearing performance, then derives a morphology-to-motion design space from those results.

![Figure 1. V-Hook morphologies, workflow, and applications.](/media/images/docs/figures/figure-01-overview.png)

## Introduction

Vibration is already common in mobile devices, interactive artifacts, tools, and small robotic systems. In HCI it is often used for feedback or notifications, but it also offers a compelling route for generating motion without wheels, joints, or more complex transmission mechanisms.

The challenge is controllability. Existing approaches often rely on custom mechanical designs, extra control electronics, or extensive tuning, which makes them harder to reproduce, reuse, and integrate into everyday objects. V-Hook asks whether some of that control can be pushed upstream into fabrication itself.

The core idea is to use low-cost 3D printing to author motion structurally. Rather than adding more control layers after fabrication, V-Hook encodes directional behavior through hook-shaped morphologies that respond predictably under vibration.

## Contributions

- A fabrication-oriented motion primitive that encodes controllable vibration-driven motion through 3D-printed hook morphologies.
- A systematic relationship between hook morphology, directional motion behavior, and the parameters that influence performance.
- A design tool and online platform that support motion authoring, sharing, and reuse.
- A set of application prototypes showing how the approach can support lightweight interactive objects and robotic systems.

## Related Work

### Vibration-Driven Locomotion

Prior work uses internal vibration motors, eccentric masses, piezoelectric elements, or external vibration platforms to create motion. These systems can be lightweight and easy to package, but they often support only a limited set of behaviors and can be difficult to control robustly.

V-Hook takes a different route. Instead of increasing control complexity, it introduces predictable directional bias through fabrication and hook morphology itself.

### Morphology and 3D Printing for Encoding Motion

Across HCI and robotics, morphology is increasingly treated as an active medium for shaping behavior rather than a passive shell around actuators. With digital fabrication, especially 3D printing, that idea becomes practical: behavior can be shaped more directly through form.

V-Hook extends this direction by making contact morphology itself the primary encoding medium for motion behavior.

### CAD Tools for Customizable Motion Design

As motion behavior becomes tied to morphology, fabrication parameters, and modular composition, designers need tools that help them generate, compare, and reuse these mappings. V-Hook contributes a workflow that turns target motion, morphology parameters, and manufacturable structures into a usable design process.

## V-Hook Overview

### Fabrication Pipeline

V-Hook is fabricated on a standard FDM printer, using a Prusa Mk3S+ with a 0.4 mm nozzle and PolyMax PLA as the primary material. By controlling extrusion amount and printhead travel speed during suspended extrusion, the filament deforms under gravity and forms a smooth hook geometry.

From this process, the paper defines four fundamental hook morphologies:

- Full hook
- Tilted hook
- Half hook
- Double hook

These structures can be further parameterized by angle, spacing, support-wall placement, height, hook length, and density. That parameterization creates a much richer design space than a single fixed hook shape.

![Figure 2. Hook types, fabrication, and motion under vibration.](/media/images/docs/figures/figure-02-motion-principle.png)

### Motion Principle

Under vibration excitation, the hooks interact with the support surface through asymmetric friction and stick-slip effects, creating directional motion.

- Tilted, full, and double hooks usually move in the same direction as their bend.
- Half hooks tend to move in the opposite direction.
- Double hooks behave more like springs and show stronger upward motion tendencies under vibration.

## Parametric Testing and Evaluation

### Experimental Setup

The paper evaluates V-Hook using a copper-coil vibration platform controlled by an SDVC-31 controller. Output voltage was fixed at 90 V during the main studies, while motion was explored by varying output frequency.

Motion accuracy was measured from start and end position, and load-bearing was evaluated by progressively adding weight. The baseline prototype used:

- Full hook morphology
- `10 x 10` density
- 100 hooks
- 20 mm hook length
- 48 mm x 48 mm footprint
- 1.2 mm base thickness
- 4.6 g total mass

![Figure 3. Experimental setup and basic testing.](/media/images/docs/figures/figure-03-experimental-setup.png)

### Basic Findings

The paper reports that motion accuracy first improves and then decreases as vibration frequency changes, meaning there is a usable frequency band where motion remains highly accurate. In some conditions, motion approached nearly straight travel.

Load-bearing decreases as payload increases, but the system remains surprisingly strong for its size. A tested module weighing only 3.8 g transported payloads up to 270 g, roughly a `71:1` payload-to-weight ratio. Compression tests also showed strong structural robustness.

### Effects of Morphology, Density, and Length

- Half hooks showed slightly lower motion accuracy than the other basic morphologies, likely because they deform more easily in multiple directions.
- Double hooks exhibited stronger elasticity and more upward tendency because of their spring-like structure.
- Increasing density improved load-bearing capacity, but narrowed the frequency range for high-accuracy motion and introduced more interference among hooks.
- Increasing hook length improved motion accuracy up to a point, but excessive length reduced structural stiffness and sharply hurt performance.

### Summary of Evaluation

The studies show that V-Hook can produce tunable and predictable motion under simple vibration input. The trade-off is that motion accuracy, load-bearing, structural stability, and printability must be balanced together rather than optimized independently.

## Design Space

![Figure 5. Design space.](/media/images/docs/figures/figure-05-design-space.png)

### Integrating Multiple Morphologies on a Single Base

Different morphologies, densities, and lengths respond differently to vibration. The paper shows that multiple hook types can be fabricated on the same substrate, allowing one prototype to encode multiple motion responses in a single structure.

### Modifying the Base: From 2D Motion to 3D Motion

By changing the base rather than the hooks themselves, the prototype can shift its center of mass and expand from planar locomotion into rolling, rocking, and lifting behaviors. This extends V-Hook from surface motion to more volumetric motion expression.

### Connecting Modules for Motion Composition

V-Hook units can also be connected through hinges, adhesives, and other methods. This allows designers to build sequential, coupled, or competing motion behaviors from simpler modules, making the system a reusable compositional building block.

## Design Tool

### Software Tool

The paper describes a low-barrier software tool built with Rhinoceros, Grasshopper, and Human UI. Users can select a base, specify the bottom surface, set object weight and hook type, and then work through a parametric design interface. The tool packages fabrication and motion knowledge into an accessible workflow and previews expected motion through animation.

![Figure 6. Software design tool.](/media/images/docs/figures/figure-06-design-tool.png)

### Online Platform

The paper also presents an online platform for sharing V-Hook design knowledge. The website treats code not just as fabrication instructions, but as an encoding of motion behavior. Users can browse morphology settings, motion patterns, and application examples, then adapt designs by modifying or recombining them.

![Figure 7. Online platform.](/media/images/docs/figures/figure-07-online-platform.png)

## Applications

### Turning Everyday Vibration into Visible Motion

The paper shows V-Hook attached to:

- 3D-printed prototypes, where printer vibration can animate fresh prints
- Speakers, where audio vibration produces rhythmic movement
- Phone cases, where vibration becomes spatial behavior such as moving or rotating the phone

![Figure 8. Everyday vibration applications.](/media/images/docs/figures/figure-08-everyday-vibration.png)

### Playful and Participatory Motion Systems

Examples include:

- `V-Lego`, which lets children create moving LEGO-compatible assemblies
- `V-Curling`, where changes in surface friction affect movement and collision behavior

![Figure 9. V-Lego.](/media/images/docs/figures/figure-09-v-lego.png)

![Figure 10. V-Curling.](/media/images/docs/figures/figure-10-v-curling.png)

### Attach-On Motion Carrier

V-Hook can be added onto everyday objects such as monitoring cameras or shared documents so they can shift, rotate, or reposition across a surface.

![Figure 11. Attach-on motion carrier.](/media/images/docs/figures/figure-11-attach-on-motion.png)

### Lightweight V-Robot

The paper presents a lightweight robot integrating an ESP32 Bluetooth board and servo motor into a V-Hook structure. Example scenarios include agricultural motion and seeding, as well as small household transport and cleaning tasks.

![Figure 12. Lightweight V-Robot.](/media/images/docs/figures/figure-12-v-robot.png)

## Discussion and Future Work

The authors frame morphology as a primary design variable rather than a passive mechanical outcome. They note that the current design space still focuses mostly on macro-level parameters and that finer-grained morphology-to-motion mappings remain to be developed.

The paper also discusses:

- The role of PLA in balancing stiffness and elasticity
- Trade-offs among accuracy, stability, and load-bearing
- Boundaries imposed by vibration intensity and operating conditions
- Opportunities for richer dynamic metrics, such as speed, trajectory stability, jump height, and recovery behavior

## Conclusion

V-Hook reframes vibration-driven locomotion as a morphology design problem. Instead of depending on complex control systems, it encodes behavior into 3D-printed hook structures that can be fabricated with accessible tools, parameterized systematically, and reused through software and online sharing.

That shift makes motion design lighter-weight, more reproducible, and easier to integrate into interactive objects, prototypes, and compact robotic systems.

## Source Files

- Original PDF: `uist26a-sub6123-i7.pdf`
- Raw extracted text: `data/docs/uist26a-sub6123-i7-extracted.txt`
