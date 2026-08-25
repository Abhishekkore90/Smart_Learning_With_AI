import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

function AllMarksPath() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(localStorage.getItem("language") || "English");
  const [activeButton, setActiveButton] = useState(null);

  useEffect(() => {
    setLanguage(localStorage.getItem("language") || "English");
  }, []);

  const buttons = [
    {
      label: { English: "Enter Marks of 1st to 8th", Marathi: "पहिली ते आठवी साठी गुण प्रविष्ट करा" },
      path: "/GunaNeendani"
    },
    {
      label: { English: "Enter Marks of 9th 10th", Marathi: "नववी दहावी साठी गुण प्रविष्ट करा" },
      path: "/markenterssc"
    }
  ];

  useEffect(() => {
    const storedLanguage = localStorage.getItem("language") || "English";
    const storedActive = localStorage.getItem("activePath");
    setLanguage(storedLanguage);
    if (storedActive) setActiveButton(storedActive);
  }, []);
  
  const handleClick = (path) => {
    setActiveButton(path);
    localStorage.setItem("activePath", path);
    setTimeout(() => {
      navigate(path);
    }, 150);
  };
  

  const renderButton = (button) => {
    const isActive = activeButton === button.path;
    const buttonStyle = {
      padding: "14px 24px",
      margin: "10px",
      fontSize: "16px",
      fontWeight: "600",
      borderRadius: "8px",
      background: isActive ? "#34d399" : "#6366f1", // green for active, blue for rest
      color: "#fff",
      border: "none",
      cursor: "pointer",
      boxShadow: isActive
        ? "0 4px 15px rgba(52, 211, 153, 0.5)"
        : "0 4px 15px rgba(99, 102, 241, 0.4)",
      transition: "all 0.3s ease",
    };

    return (
      <motion.button
        key={button.path}
        onClick={() => handleClick(button.path)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={buttonStyle}
      >
        {language === "English" ? button.label.English : button.label.Marathi}
      </motion.button>
    );
  };

  return (
    <div style={{ textAlign: "center", padding: "20px", marginBottom: "20px" }} className="main-content-of-page">
      {buttons.map(renderButton)}
    </div>
  );
}

export default AllMarksPath;
