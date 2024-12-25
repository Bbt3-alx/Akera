import { Check } from "lucide-react";

// Component to display password criteria (requirements the password must meet)
const PasswordCriteria = ({ password }) => {
  // Define the password requirements as an array of objects
  const criteria = [
    { label: "At least 6 characters", met: password.length >= 6 }, // Check if password has at least 6 characters
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) }, // Check if password contains at least one uppercase letter
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) }, // Check if password contains at least one lowercase letter
    { label: "Contains a number", met: /\d/.test(password) }, // Check if password contains at least one number
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) }, // Check if password contains a special character
  ];

  // Render the password criteria list
  return (
    <div className="mt-2 space-y-1">
      {criteria.map((item) => {
        return (
          <div key={item.label} className="flex items-center text-xs">
            {/* If the password meets the current criteria, show a green check mark */}
            {item.met ? (
              <Check className="size-4 text-green-500 mr-2" />
            ) : (
              // If the password doesn't meet the criteria, show a gray "x"
              <x className="size-4 text-gray-500 mr-2" />
            )}

            {/* Change the text color based on whether the criteria is met */}
            <span className={item.met ? "text-green-500" : "text-gray-400"}>
              {item.label} {/* Display the text for each criterion */}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Component to display the password strength (based on various criteria)
const PasswordStrength = ({ password }) => {
  // Function to calculate password strength based on criteria
  const getStrength = (pass) => {
    let strength = 0; // Initialize strength to 0 (weak)

    // Increase strength for each criteria met
    if (pass.length >= 6) strength++; // Check if password has at least 6 characters
    if (pass.match(/[a-z]/) && pass.match(/[A-Z]/)) strength++; // Check if password has both lowercase and uppercase letters
    if (pass.match(/\d/)) strength++; // Check if password has a number
    if (pass.match(/[^a-zA-Z\d]/)) strength++; // Check if password has a special character

    return strength; // Return the calculated strength
  };

  const strength = getStrength(password); // Calculate the password strength

  // Function to determine the color based on password strength
  const getColor = (strength) => {
    if (strength === 0) return "bg-red-500"; // Very weak
    if (strength === 1) return "bg-red-400"; // Weak
    if (strength === 2) return "bg-yellow-500"; // Fair
    if (strength === 3) return "bg-yellow-400"; // Good
    return "bg-green-500"; // Strong
  };

  // Function to determine the text label based on strength
  const getStrengthText = (strength) => {
    if (strength === 0) return "Very weak";
    if (strength === 1) return "Weak";
    if (strength === 2) return "Fair";
    if (strength === 3) return "Good";
    return "Strong"; // For strength level 4 or above
  };

  return (
    <div className="mt-2">
      {/* Displaying the password strength label and the calculated strength text */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-400">Password strength</span>
        <span className="text-xs text-gray-400">
          {getStrengthText(strength)}{" "}
        </span>
      </div>

      {/* Displaying password strength bars */}
      <div className="flex space-x-1">
        {/* Create 4 strength bars, one for each level of strength */}
        {[...Array(4)].map((_, index) => (
          <div
            key={index}
            className={`h-1 w-1/4 rounded-full transition-colors duration-100  
              ${index < strength ? getColor(strength) : "bg-gray-600"}`}
          />
        ))}
      </div>

      {/* Display the criteria for a strong password */}
      <PasswordCriteria password={password} />
    </div>
  );
};

export default PasswordStrength;
