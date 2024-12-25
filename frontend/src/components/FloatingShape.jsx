import { motion } from "framer-motion";

const FloatingShape = ({ color, size, top, left, delay }) => {
  return (
    <motion.div
      className={`absolute rounded-full ${color} ${size} opacity-20 blur-xl`}
      style={{ top, left }}
      animate={{
        y: ["0%", "100%", "0%"], // Vertical animation
        x: ["0%", "100%", "0%"], // Horizontal animation
        rotate: [0, 360], // Rotation animation
      }}
      transition={{
        duration: 20,
        ease: "linear",
        repeat: "Infinity", // Animation repeats indefinitely
        delay,
      }}
      aria-hidden="true"
    />
  );
};

export default FloatingShape;
