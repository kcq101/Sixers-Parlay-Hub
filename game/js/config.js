// Shared positions (metres). See physics.js for the coordinate system.
// The shooter stands just behind the free-throw line (z = 4.57), a little left of the ball,
// which he holds just above and in front of his forehead.
// z is the middle of his feet: 4.80 puts his toes about 2 inches behind the free-throw line (z 4.57, 2 in wide).
export const SHOOTER = { x: -0.1, z: 4.80, height: 1.85 };   // x is used by the placeholder only
export const RELEASE = { x: 0, y: 2.04, z: 4.44 };            // replaced by the animation's release point once it loads
export const CAMERA = { x: 0, y: 2.0, z: 12.16 };   // about 6.5 ft up, well behind the shooter: the 10 ft rim reads clearly above him
export const LOOK_AT = { x: 0, y: 2.25, z: 0.4 };
