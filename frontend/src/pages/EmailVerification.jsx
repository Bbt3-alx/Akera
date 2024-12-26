import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore.js";
import toast from "react-hot-toast";

// EmailVerificationPage Component: This handles verifying a 6-digit email verification code.
const EmailVerification = () => {
  // State to store the 6-digit code entered by the user.
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  // useRef to store references to the input fields for better focus control.
  const inputRefs = useRef([]);

  const navigate = useNavigate();
  const { error, isLoading, verifyEmail } = useAuthStore();

  // Function to handle changes in the input fields.
  const handleChange = (index, value) => {
    const newCode = [...code];

    if (value.length > 1) {
      // If the user pastes a value, split it into individual digits.
      const pastedCode = value.slice(0, 6).split("");
      pastedCode.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);

      // Focus the next empty input field or the last one.
      const lastFilledIndex = Math.min(index + pastedCode.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    } else {
      // Update the specific index with the new value.
      newCode[index] = value;
      setCode(newCode);

      // Automatically move to the next input field if not the last one.
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Function to handle backspace behavior.
  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      // Move focus to the previous input field if the current one is empty.
      inputRefs.current[index - 1].focus();
    }
  };

  // Function to handle form submission.
  const handleSubmit = async (e) => {
    e.preventDefault();
    const verification = code.join("");
    try {
      await verifyEmail(verification);
      navigate("/");
      toast.success("Email verified succesfully");
    } catch (error) {
      toast.error("Email verification failled");
      console.log(error);
    }
  };

  // Automatically submit the form when all six digits are filled.
  useEffect(() => {
    if (code.every((digit) => digit !== "")) {
      handleSubmit(new Event("submit"));
    }
  }, [code]);

  return (
    <div className="max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gray bg-opacity-50 backdrop-filter backdrop-blur-xl rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Header Section */}
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text">
          Verify Your Email
        </h2>
        <p className="text-center text-gray-300 mb-6">
          Enter the 6-digit code sent to your email address
        </p>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Input Fields for the 6-digit code */}
          <div className="flex justify-between">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)} // Save the input reference.
                type="text"
                maxLength="6"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-2xl font-bold bg-gray-700 text-white border-2 border-gray-600 rounded-lg focus:border-green-500 focus:outline-none"
              />
            ))}
          </div>

          {error && <p className="text-red-500 font-semibold mt-2"></p>}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={isLoading || code.some((digit) => !digit)} // Disable button if loading or inputs are incomplete.
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 
            text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:from-green-600 
            hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 
            focus:ring-opacity-50 disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify Email"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default EmailVerification;
