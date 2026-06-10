const express = require("express");
const axios = require("axios");

const router = express.Router();

// ==============================
// AI PREDICTION ROUTE
// ==============================
router.post("/predict", async (req, res) => {
  try {
    const aiResponse = await axios.post(
      "http://127.0.0.1:5001/predict",
      req.body,
      { timeout: 5000 }
    );

    res.json(aiResponse.data);

  } catch (error) {
    console.error("🔥 AI ERROR:", error.message);

    res.status(500).json({
      success: false,
      error: "AI service failed"
    });
  }
});

module.exports = router;