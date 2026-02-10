import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import "./App.css";
import CustomSelect from './CustomSelect';

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [activeTab, setActiveTab] = useState("predict");
  const [customers, setCustomers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [explanation, setExplanation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [filterRisk, setFilterRisk] = useState("all");

  const [formData, setFormData] = useState({
    customer_id: "",
    gender: "Female",
    SeniorCitizen: 0,
    Partner: "No",
    Dependents: "No",
    tenure: 12,
    PhoneService: "Yes",
    MultipleLines: "No",
    InternetService: "Fiber optic",
    OnlineSecurity: "No",
    OnlineBackup: "No",
    DeviceProtection: "No",
    TechSupport: "No",
    StreamingTV: "No",
    StreamingMovies: "No",
    Contract: "Month-to-month",
    PaperlessBilling: "Yes",
    PaymentMethod: "Electronic check",
    MonthlyCharges: 70.0,
    TotalCharges: 840.0,
  });

  useEffect(() => {
    document.body.className = darkMode ? "dark-mode" : "light-mode";
  }, [darkMode]);

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchDashboardData();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      const [customersRes, analyticsRes, trendsRes] = await Promise.all([
        axios.get(`${API_URL}/customers?limit=100`),
        axios.get(`${API_URL}/analytics/dashboard`),
        axios.get(`${API_URL}/analytics/trends`)
      ]);

      setCustomers(customersRes.data.customers || []);
      setAnalytics(analyticsRes.data);
      setTrends(trendsRes.data.trends || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handlePredict = async () => {
    try {
      setLoading(true);

      const predictRes = await axios.post(`${API_URL}/predict`, formData);
      setPrediction(predictRes.data);

      const explainRes = await axios.post(`${API_URL}/explain`, formData);
      setExplanation(explainRes.data.top_factors);

      // Refresh dashboard if on that tab
      if (activeTab === "dashboard") {
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error connecting to backend. Make sure the API is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => {
      const updatedData = {
        ...prev,
        [name]: name === "SeniorCitizen" ? parseInt(value) :
          name === "tenure" ? parseInt(value) :
            name === "MonthlyCharges" || name === "TotalCharges" ? parseFloat(value) :
              value
      };

      // Auto-calculate TotalCharges when tenure or MonthlyCharges changes
      if (name === "tenure" || name === "MonthlyCharges") {
        const tenure = name === "tenure" ? parseInt(value) : prev.tenure;
        const monthlyCharges = name === "MonthlyCharges" ? parseFloat(value) : prev.MonthlyCharges;
        updatedData.TotalCharges = parseFloat((tenure * monthlyCharges).toFixed(2));
      }

      return updatedData;
    });
  };

  const viewCustomerDetails = async (customerId) => {
    try {
      const res = await axios.get(`${API_URL}/customer/${customerId}`);
      setSelectedCustomer(res.data);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const getRiskColor = (risk) => {
    const colors = {
      Critical: "#ef4444",
      High: "#f97316",
      Medium: "#eab308",
      Low: "#22c55e"
    };
    return colors[risk] || "#6b7280";
  };

  const filteredCustomers = filterRisk === "all"
    ? customers
    : customers.filter(c => c.last_prediction?.risk_level === filterRisk);

  // ==================== RENDER FUNCTIONS ====================

  const renderPredictTab = () => (
    <div className="predict-section">
      <div className="form-grid">
        <div className="form-section">
          <h3>📋 Customer Information</h3>

          <div className="form-row">
            <label>Customer ID (optional)</label>
            <input
              type="text"
              name="customer_id"
              value={formData.customer_id}
              onChange={handleInputChange}
              placeholder="Auto-generated if empty"
            />
          </div>

          <CustomSelect
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            options={['Male', 'Female']}
            label="Gender"
          />

          <CustomSelect
            name="SeniorCitizen"
            value={formData.SeniorCitizen}
            onChange={handleInputChange}
            options={[
              { value: 0, label: 'No' },
              { value: 1, label: 'Yes' }
            ]}
            label="Senior Citizen"
          />

          <CustomSelect
            name="Partner"
            value={formData.Partner}
            onChange={handleInputChange}
            options={['Yes', 'No']}
            label="Partner"
          />

          <CustomSelect
            name="Dependents"
            value={formData.Dependents}
            onChange={handleInputChange}
            options={['Yes', 'No']}
            label="Dependents"
          />

          <div className="form-row">
            <label>Tenure (months)</label>
            <input
              type="number"
              name="tenure"
              value={formData.tenure}
              onChange={handleInputChange}
              min="0"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>📞 Services</h3>

          <CustomSelect
            name="PhoneService"
            value={formData.PhoneService}
            onChange={handleInputChange}
            options={['Yes', 'No']}
            label="Phone Service"
          />

          <CustomSelect
            name="MultipleLines"
            value={formData.MultipleLines}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No phone service']}
            label="Multiple Lines"
          />

          <CustomSelect
            name="InternetService"
            value={formData.InternetService}
            onChange={handleInputChange}
            options={['DSL', 'Fiber optic', 'No']}
            label="Internet Service"
          />

          <CustomSelect
            name="OnlineSecurity"
            value={formData.OnlineSecurity}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No internet service']}
            label="Online Security"
          />

          <CustomSelect
            name="OnlineBackup"
            value={formData.OnlineBackup}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No internet service']}
            label="Online Backup"
          />

          <CustomSelect
            name="DeviceProtection"
            value={formData.DeviceProtection}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No internet service']}
            label="Device Protection"
          />

          <CustomSelect
            name="TechSupport"
            value={formData.TechSupport}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No internet service']}
            label="Tech Support"
          />

          <CustomSelect
            name="StreamingTV"
            value={formData.StreamingTV}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No internet service']}
            label="Streaming TV"
            forceDirection="up"
          />

          <CustomSelect
            name="StreamingMovies"
            value={formData.StreamingMovies}
            onChange={handleInputChange}
            options={['Yes', 'No', 'No internet service']}
            label="Streaming Movies"
            forceDirection="up"
          />
        </div>

        <div className="form-section">
          <h3>💳 Billing</h3>

          <CustomSelect
            name="Contract"
            value={formData.Contract}
            onChange={handleInputChange}
            options={['Month-to-month', 'One year', 'Two year']}
            label="Contract Type"
          />

          <CustomSelect
            name="PaperlessBilling"
            value={formData.PaperlessBilling}
            onChange={handleInputChange}
            options={['Yes', 'No']}
            label="Paperless Billing"
          />

          <CustomSelect
            name="PaymentMethod"
            value={formData.PaymentMethod}
            onChange={handleInputChange}
            options={[
              'Electronic check',
              'Mailed check',
              'Bank transfer (automatic)',
              'Credit card (automatic)'
            ]}
            label="Payment Method"
            forceDirection="up"
          />

          <div className="form-row">
            <label>Monthly Charges ($)</label>
            <input
              type="number"
              name="MonthlyCharges"
              value={formData.MonthlyCharges}
              onChange={handleInputChange}
              step="0.01"
              min="0"
            />
          </div>

          <div className="form-row">
            <label>Total Charges ($) - Auto-calculated</label>
            <input
              type="number"
              name="TotalCharges"
              value={formData.TotalCharges}
              readOnly
              step="0.01"
              min="0"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                cursor: 'not-allowed',
                fontWeight: '600',
                color: 'var(--primary)'
              }}
              title="Automatically calculated as: Tenure × Monthly Charges"
            />
          </div>
        </div>
      </div>

      <button className="analyze-btn" onClick={handlePredict} disabled={loading}>
        {loading ? "🔄 Analyzing..." : "🔍 Analyze Churn Risk"}
      </button>

      {prediction && (
        <div className="results-section">
          <div className={`prediction-card ${prediction.risk_level.toLowerCase()}-risk`}>
            <div className="prediction-header">
              <h2>
                {prediction.risk_level === "Critical" && "🚨"}
                {prediction.risk_level === "High" && "⚠️"}
                {prediction.risk_level === "Medium" && "⚡"}
                {prediction.risk_level === "Low" && "✅"}
                {" "}{prediction.risk_level} Churn Risk
              </h2>
              <div className="probability-badge">
                {(prediction.churn_probability * 100).toFixed(1)}%
              </div>
            </div>

            <div className="customer-info">
              <p><strong>Customer ID:</strong> {prediction.customer_id}</p>
              <p><strong>Predicted:</strong> {new Date(prediction.predicted_at).toLocaleString()}</p>
            </div>

            <div className="recommendations">
              <h3>💡 Retention Strategies</h3>
              <ul>
                {prediction.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="explanation-card">
            <h3>📊 Key Factors Influencing Prediction</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={explanation}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                <XAxis
                  dataKey="feature"
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                  height={120}
                  tick={{ fill: darkMode ? "#9ca3af" : "#4b5563", fontSize: 11 }}
                />
                <YAxis tick={{ fill: darkMode ? "#9ca3af" : "#4b5563" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: darkMode ? "#1f2937" : "#ffffff",
                    border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                    borderRadius: "8px"
                  }}
                />
                <Bar dataKey="impact" radius={[8, 8, 0, 0]}>
                  {explanation.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.impact > 0 ? "#ef4444" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );

  const renderDashboardTab = () => {
    if (!analytics) return <div className="loading">Loading dashboard...</div>;

    const riskData = Object.entries(analytics.risk_distribution || {}).map(([key, value]) => ({
      name: key,
      value,
      color: getRiskColor(key)
    }));

    return (
      <div className="dashboard-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-value">{analytics.total_customers}</div>
              <div className="stat-label">Total Customers</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{(analytics.avg_churn_probability * 100).toFixed(1)}%</div>
              <div className="stat-label">Avg Churn Risk</div>
            </div>
          </div>

          <div className="stat-card critical">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <div className="stat-value">{analytics.high_value_at_risk}</div>
              <div className="stat-label">High-Value at Risk</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🔮</div>
            <div className="stat-content">
              <div className="stat-value">{analytics.total_predictions}</div>
              <div className="stat-label">Total Predictions</div>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>📈 Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {trends.length > 0 && (
            <div className="chart-card">
              <h3>📉 Churn Probability Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: darkMode ? "#9ca3af" : "#4b5563", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: darkMode ? "#9ca3af" : "#4b5563" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: darkMode ? "#1f2937" : "#ffffff",
                      border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
                      borderRadius: "8px"
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_churn_probability"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: "#8b5cf6", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="customers-table-section">
          <div className="table-header">
            <h3>👥 Customer List</h3>
            <div className="filter-controls">
              <CustomSelect
                name="filterRisk"
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                options={[
                  { value: 'all', label: 'All Customers' },
                  { value: 'Critical', label: 'Critical' },
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' }
                ]}
                label="Filter by Risk:"
              />
            </div>
          </div>

          <div className="table-container">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Tenure</th>
                  <th>Contract</th>
                  <th>Monthly Charges</th>
                  <th>Risk Level</th>
                  <th>Churn Probability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, idx) => (
                  <tr key={idx}>
                    <td><strong>{customer.customer_id}</strong></td>
                    <td>{customer.tenure} months</td>
                    <td>{customer.Contract}</td>
                    <td>${customer.MonthlyCharges?.toFixed(2)}</td>
                    <td>
                      <span
                        className="risk-badge"
                        style={{ backgroundColor: getRiskColor(customer.last_prediction?.risk_level) }}
                      >
                        {customer.last_prediction?.risk_level || "Unknown"}
                      </span>
                    </td>
                    <td>
                      {customer.last_prediction
                        ? `${(customer.last_prediction.churn_probability * 100).toFixed(1)}%`
                        : "N/A"
                      }
                    </td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => viewCustomerDetails(customer.customer_id)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <header className="header">
        <div className="header-content">
          <h1>
            <span className="logo-icon">🎯</span>
            Customer Churn Intelligence Platform
          </h1>
          <button
            className="theme-toggle"
            onClick={(e) => {
              setDarkMode(!darkMode);
              e.currentTarget.blur(); // Remove focus after click
            }}
            title={`Switch to ${darkMode ? "light" : "dark"} mode`}
            aria-label="Toggle theme"
          >
            <span className="toggle-track">
              <span className={`toggle-thumb ${darkMode ? 'dark' : 'light'}`}>
                {darkMode ? "🌙" : "☀️"}
              </span>
            </span>
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button
          className={activeTab === "predict" ? "active" : ""}
          onClick={(e) => {
            setActiveTab("predict");
            e.currentTarget.blur();
          }}
        >
          🔍 Predict Churn
        </button>
        <button
          className={activeTab === "dashboard" ? "active" : ""}
          onClick={(e) => {
            setActiveTab("dashboard");
            e.currentTarget.blur();
          }}
        >
          📊 Dashboard
        </button>
      </nav>

      <main className="main-content">
        {activeTab === "predict" && renderPredictTab()}
        {activeTab === "dashboard" && renderDashboardTab()}
      </main>

      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedCustomer(null)}>×</button>

            <h2>Customer Profile: {selectedCustomer.customer_id}</h2>

            <div className="modal-sections">
              <div className="modal-section">
                <h3>📊 Risk Assessment</h3>
                <div className="risk-display">
                  <span
                    className="risk-badge large"
                    style={{ backgroundColor: getRiskColor(selectedCustomer.last_prediction?.risk_level) }}
                  >
                    {selectedCustomer.last_prediction?.risk_level || "Unknown"}
                  </span>
                  <div className="probability-display">
                    {selectedCustomer.last_prediction
                      ? `${(selectedCustomer.last_prediction.churn_probability * 100).toFixed(1)}%`
                      : "N/A"
                    }
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <h3>💰 Financial Info</h3>
                <p><strong>Monthly Charges:</strong> ${selectedCustomer.MonthlyCharges?.toFixed(2)}</p>
                <p><strong>Total Charges:</strong> ${selectedCustomer.TotalCharges?.toFixed(2)}</p>
                <p><strong>Lifetime Value:</strong> ${selectedCustomer.lifetime_value?.toFixed(2)}</p>
              </div>

              <div className="modal-section">
                <h3>📋 Account Details</h3>
                <p><strong>Tenure:</strong> {selectedCustomer.tenure} months</p>
                <p><strong>Contract:</strong> {selectedCustomer.Contract}</p>
                <p><strong>Internet:</strong> {selectedCustomer.InternetService}</p>
                <p><strong>Payment:</strong> {selectedCustomer.PaymentMethod}</p>
              </div>

              <div className="modal-section">
                <h3>🛡️ Services</h3>
                <p><strong>Online Security:</strong> {selectedCustomer.OnlineSecurity}</p>
                <p><strong>Tech Support:</strong> {selectedCustomer.TechSupport}</p>
                <p><strong>Streaming TV:</strong> {selectedCustomer.StreamingTV}</p>
                <p><strong>Device Protection:</strong> {selectedCustomer.DeviceProtection}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Powered by AI-driven Predictive Analytics | Built with React + FastAPI + Machine Learning</p>
      </footer>
    </div>
  );
}

export default App;