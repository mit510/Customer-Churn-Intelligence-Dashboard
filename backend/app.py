from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
import shap
import numpy as np

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Load trained model
# -----------------------------
model_pipeline = joblib.load("model/churn_model.pkl")

# Extract preprocessor & classifier
preprocessor = model_pipeline.named_steps["preprocessor"]
model = model_pipeline.named_steps["classifier"]

# SHAP explainer (Tree-based model like RF/XGB)
explainer = shap.TreeExplainer(model)


# -----------------------------
# Request Schema
# -----------------------------
class CustomerData(BaseModel):
    gender: str
    SeniorCitizen: int
    Partner: str
    Dependents: str
    tenure: int
    PhoneService: str
    MultipleLines: str
    InternetService: str
    OnlineSecurity: str
    OnlineBackup: str
    DeviceProtection: str
    TechSupport: str
    StreamingTV: str
    StreamingMovies: str
    Contract: str
    PaperlessBilling: str
    PaymentMethod: str
    MonthlyCharges: float
    TotalCharges: float


# -----------------------------
# Root Endpoint
# -----------------------------
@app.get("/")
def home():
    return {"status": "API Running Successfully"}


# -----------------------------
# Prediction Endpoint
# -----------------------------
@app.post("/predict")
def predict(data: CustomerData):

    # Convert to DataFrame
    input_df = pd.DataFrame([data.dict()])

    # Predict
    prediction = model_pipeline.predict(input_df)[0]
    probability = model_pipeline.predict_proba(input_df)[0][1]

    return {
        "churn_prediction": int(prediction),
        "churn_probability": round(float(probability), 4)
    }


# -----------------------------
# Explain Endpoint (SHAP)
# -----------------------------
@app.post("/explain")
@app.post("/explain")
def explain(data: CustomerData):
    try:
        # Convert to DataFrame
        input_df = pd.DataFrame([data.dict()])

        # Transform input
        transformed = preprocessor.transform(input_df)

        # Get SHAP values
        shap_values = explainer(transformed)

        # Get feature names
        feature_names = preprocessor.get_feature_names_out()

        # Extract raw numpy array
        contributions = shap_values.values

        # Handle binary classification shape
        if contributions.ndim == 3:
            # shape: (1, n_features, 2)
            contributions = contributions[0][:, 1]
        elif contributions.ndim == 2:
            # shape: (1, n_features)
            contributions = contributions[0]

        # FORCE flatten to pure 1D numpy array
        contributions = contributions.flatten()

        shap_list = []
        for name, value in zip(feature_names, contributions):
            shap_list.append({
                "feature": name,
                "impact": float(value)
            })

        # Sort by absolute impact
        shap_list.sort(key=lambda x: abs(x["impact"]), reverse=True)

        return {
            "top_factors": shap_list[:10]
        }

    except Exception as e:
        return {"error": str(e)}
