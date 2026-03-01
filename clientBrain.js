// clientBrain.js

let brainInstance = null;

export function getBrain() {
  if (!brainInstance) {
    brainInstance = {
      aliveSince: Date.now(),
      memory: {},
      status: "initialized"
    };

    console.log("🧠 Brain created on client");
  }

  return brainInstance;
}
