import React, { useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

function App() {
  const [prediction, setPrediction] = useState(null);
  const [probability, setProbability] = useState(null);
  const [explanation, setExplanation] = useState([]);
  const [loading, setLoading] = useState(false);

  const sampleCustomer = {
    gender: "Female",
    SeniorCitizen: 0,
    Partner: "Yes",
    Dependents: "No",
    tenure: 5,
    PhoneService: "Yes",
    MultipleLines: "No",
    InternetService: "Fiber optic",
    OnlineSecurity: "No",
    OnlineBackup: "No",
    DeviceProtection: "No",
    TechSupport: "No",
    StreamingTV: "Yes",
    StreamingMovies: "Yes",
    Contract: "Month-to-month",
    PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check",
    MonthlyCharges: 89.5,
    TotalCharges: 450.0,
  };

  const handleAnalyze = async () => {
    try {
      setLoading(true);

      // Call prediction endpoint
      const predictRes = await axios.post(
        "http://127.0.0.1:8000/predict",
        sampleCustomer
      );

      setPrediction(predictRes.data.churn_prediction);
      setProbability(predictRes.data.churn_probability);

      // Call explanation endpoint
      const explainRes = await axios.post(
        "http://127.0.0.1:8000/explain",
        sampleCustomer
      );

      setExplanation(explainRes.data.top_factors);
    } catch (error) {
      console.error("Error:", error);
      alert("Error connecting to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Customer Churn Intelligence Dashboard</h1>

      <button onClick={handleAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Customer"}
      </button>

      {prediction !== null && (
        <>
          <div className="prediction-box">
            <h2>
              {prediction === 1
                ? "⚠ High Churn Risk"
                : "✅ Low Churn Risk"}
            </h2>
            <p>Churn Probability: {(probability * 100).toFixed(2)}%</p>
          </div>

          <div className="chart-section">
            <h3>Top Factors Influencing Prediction</h3>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={explanation}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="feature"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={120}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="impact">
                  {explanation.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.impact > 0.04
                          ? "#ef4444"   // strong churn driver
                          : "#3b82f6"   // moderate factor
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
