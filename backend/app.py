from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import pandas as pd
import joblib
import shap
import numpy as np
import json
from collections import defaultdict

app = FastAPI(title="Advanced Customer Churn Intelligence API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model
model_pipeline = joblib.load("model/churn_model.pkl")  # ⚠️ CHANGE THIS PATH IF NEEDED
preprocessor = model_pipeline.named_steps["preprocessor"]
model = model_pipeline.named_steps["classifier"]
explainer = shap.TreeExplainer(model)

# In-memory storage (in production, use a real database)
customers_db = {}
predictions_history = []

# ==================== MODELS ====================
class CustomerData(BaseModel):
    customer_id: Optional[str] = None
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

class PredictionResponse(BaseModel):
    customer_id: str
    churn_prediction: int
    churn_probability: float
    risk_level: str
    predicted_at: str
    recommendations: List[str]

class BatchPredictionRequest(BaseModel):
    customers: List[CustomerData]

# ==================== HELPER FUNCTIONS ====================
def get_risk_level(probability: float) -> str:
    if probability >= 0.7:
        return "Critical"
    elif probability >= 0.5:
        return "High"
    elif probability >= 0.3:
        return "Medium"
    return "Low"

def generate_recommendations(customer_data: dict, shap_values: list) -> List[str]:
    """Generate actionable retention recommendations based on SHAP analysis"""
    recommendations = []
    
    # Sort factors by impact
    top_factors = sorted(shap_values, key=lambda x: abs(x['impact']), reverse=True)[:5]
    
    for factor in top_factors:
        feature = factor['feature']
        impact = factor['impact']
        
        if impact > 0:  # Positive impact means increasing churn
            if 'Contract_Month-to-month' in feature:
                recommendations.append("💡 Offer annual contract with 20% discount")
            elif 'tenure' in feature.lower():
                recommendations.append("🎁 Implement loyalty rewards for long-term customers")
            elif 'TechSupport_No' in feature:
                recommendations.append("🔧 Provide free tech support for 3 months")
            elif 'OnlineSecurity_No' in feature:
                recommendations.append("🛡️ Bundle online security at reduced rate")
            elif 'MonthlyCharges' in feature:
                recommendations.append("💰 Review pricing - consider personalized discount")
            elif 'InternetService_Fiber optic' in feature:
                recommendations.append("📶 Highlight fiber optic value proposition")
            elif 'PaperlessBilling_Yes' in feature:
                recommendations.append("📧 Improve billing communication clarity")
    
    if not recommendations:
        recommendations.append("✅ Customer profile is stable - maintain quality service")
    
    return recommendations[:5]  # Top 5 recommendations

def calculate_customer_value(customer: dict) -> float:
    """Calculate customer lifetime value"""
    monthly = customer.get('MonthlyCharges', 0)
    tenure = customer.get('tenure', 0)
    
    # Simple CLV calculation
    avg_lifetime_months = 36  # Assume 3 year average
    clv = monthly * avg_lifetime_months * 0.7  # 70% margin
    
    return round(clv, 2)

# ==================== ENDPOINTS ====================

@app.get("/")
def home():
    return {
        "status": "Advanced Churn Intelligence API Running",
        "version": "2.0",
        "features": [
            "Individual predictions",
            "Batch predictions",
            "Customer management",
            "Historical tracking",
            "Advanced analytics",
            "Retention recommendations"
        ]
    }

@app.post("/predict", response_model=PredictionResponse)
def predict(data: CustomerData):
    """Enhanced prediction with recommendations"""
    
    # Generate customer ID if not provided
    if not data.customer_id:
        data.customer_id = f"CUST_{len(customers_db) + 1:05d}"
    
    # Convert to DataFrame
    input_df = pd.DataFrame([data.dict()])
    
    # Predict
    prediction = model_pipeline.predict(input_df)[0]
    probability = model_pipeline.predict_proba(input_df)[0][1]
    
    # Get SHAP explanation
    transformed = preprocessor.transform(input_df)
    shap_values = explainer(transformed)
    feature_names = preprocessor.get_feature_names_out()
    
    contributions = shap_values.values
    if contributions.ndim == 3:
        contributions = contributions[0][:, 1]
    elif contributions.ndim == 2:
        contributions = contributions[0]
    contributions = contributions.flatten()
    
    shap_list = [
        {"feature": name, "impact": float(value)}
        for name, value in zip(feature_names, contributions)
    ]
    
    # Generate recommendations
    recommendations = generate_recommendations(data.dict(), shap_list)
    
    # Store in database
    customers_db[data.customer_id] = {
        **data.dict(),
        "last_prediction": {
            "churn_probability": probability,
            "risk_level": get_risk_level(probability),
            "predicted_at": datetime.now().isoformat()
        }
    }
    
    # Store prediction history
    predictions_history.append({
        "customer_id": data.customer_id,
        "churn_probability": float(probability),
        "predicted_at": datetime.now().isoformat()
    })
    
    return PredictionResponse(
        customer_id=data.customer_id,
        churn_prediction=int(prediction),
        churn_probability=round(float(probability), 4),
        risk_level=get_risk_level(probability),
        predicted_at=datetime.now().isoformat(),
        recommendations=recommendations
    )

@app.post("/explain")
def explain(data: CustomerData):
    """Get SHAP explanation for a customer"""
    try:
        input_df = pd.DataFrame([data.dict()])
        transformed = preprocessor.transform(input_df)
        shap_values = explainer(transformed)
        feature_names = preprocessor.get_feature_names_out()
        
        contributions = shap_values.values
        if contributions.ndim == 3:
            contributions = contributions[0][:, 1]
        elif contributions.ndim == 2:
            contributions = contributions[0]
        contributions = contributions.flatten()
        
        shap_list = [
            {"feature": name, "impact": float(value)}
            for name, value in zip(feature_names, contributions)
        ]
        shap_list.sort(key=lambda x: abs(x["impact"]), reverse=True)
        
        return {
            "top_factors": shap_list[:10],
            "all_factors": shap_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-predict")
def batch_predict(request: BatchPredictionRequest):
    """Batch prediction for multiple customers"""
    results = []
    
    for customer in request.customers:
        try:
            result = predict(customer)
            results.append(result.dict())
        except Exception as e:
            results.append({
                "customer_id": customer.customer_id or "unknown",
                "error": str(e)
            })
    
    return {
        "total_processed": len(results),
        "results": results,
        "summary": {
            "critical_risk": sum(1 for r in results if r.get("risk_level") == "Critical"),
            "high_risk": sum(1 for r in results if r.get("risk_level") == "High"),
            "medium_risk": sum(1 for r in results if r.get("risk_level") == "Medium"),
            "low_risk": sum(1 for r in results if r.get("risk_level") == "Low"),
        }
    }

@app.get("/customers")
def get_customers(risk_level: Optional[str] = None, limit: int = 100):
    """Get all customers with optional filtering"""
    customers = list(customers_db.values())
    
    if risk_level:
        customers = [
            c for c in customers 
            if c.get("last_prediction", {}).get("risk_level") == risk_level
        ]
    
    return {
        "total": len(customers),
        "customers": customers[:limit]
    }

@app.get("/customer/{customer_id}")
def get_customer(customer_id: str):
    """Get specific customer details"""
    if customer_id not in customers_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = customers_db[customer_id]
    
    # Calculate additional metrics
    clv = calculate_customer_value(customer)
    
    # Get prediction history for this customer
    customer_history = [
        p for p in predictions_history 
        if p["customer_id"] == customer_id
    ]
    
    return {
        **customer,
        "lifetime_value": clv,
        "prediction_history": customer_history[-10:]  # Last 10 predictions
    }

@app.get("/analytics/dashboard")
def analytics_dashboard():
    """Get dashboard analytics"""
    if not customers_db:
        return {
            "total_customers": 0,
            "risk_distribution": {},
            "avg_churn_probability": 0,
            "high_value_at_risk": 0
        }
    
    customers = list(customers_db.values())
    
    # Risk distribution
    risk_dist = defaultdict(int)
    total_prob = 0
    high_value_at_risk = 0
    
    for customer in customers:
        if "last_prediction" in customer:
            risk_level = customer["last_prediction"]["risk_level"]
            risk_dist[risk_level] += 1
            total_prob += customer["last_prediction"]["churn_probability"]
            
            # High value customers at risk
            if risk_level in ["Critical", "High"]:
                clv = calculate_customer_value(customer)
                if clv > 2000:
                    high_value_at_risk += 1
    
    avg_prob = total_prob / len(customers) if customers else 0
    
    return {
        "total_customers": len(customers),
        "risk_distribution": dict(risk_dist),
        "avg_churn_probability": round(avg_prob, 4),
        "high_value_at_risk": high_value_at_risk,
        "total_predictions": len(predictions_history),
        "customers_by_contract": {
            "Month-to-month": sum(1 for c in customers if c.get("Contract") == "Month-to-month"),
            "One year": sum(1 for c in customers if c.get("Contract") == "One year"),
            "Two year": sum(1 for c in customers if c.get("Contract") == "Two year"),
        }
    }

@app.get("/analytics/trends")
def analytics_trends():
    """Get churn probability trends over time"""
    if not predictions_history:
        return {"trends": []}
    
    # Group by date
    daily_predictions = defaultdict(list)
    
    for pred in predictions_history:
        date = pred["predicted_at"][:10]  # Get date part
        daily_predictions[date].append(pred["churn_probability"])
    
    trends = [
        {
            "date": date,
            "avg_churn_probability": round(sum(probs) / len(probs), 4),
            "predictions_count": len(probs)
        }
        for date, probs in sorted(daily_predictions.items())
    ]
    
    return {"trends": trends}

@app.get("/analytics/feature-importance")
def feature_importance():
    """Get global feature importance from the model"""
    if hasattr(model, 'feature_importances_'):
        feature_names = preprocessor.get_feature_names_out()
        importances = model.feature_importances_
        
        importance_data = [
            {"feature": name, "importance": float(imp)}
            for name, imp in zip(feature_names, importances)
        ]
        importance_data.sort(key=lambda x: x["importance"], reverse=True)
        
        return {
            "top_features": importance_data[:15],
            "all_features": importance_data
        }
    
    return {"message": "Feature importance not available for this model"}

@app.delete("/customer/{customer_id}")
def delete_customer(customer_id: str):
    """Delete a customer"""
    if customer_id not in customers_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    del customers_db[customer_id]
    return {"message": "Customer deleted successfully"}

@app.get("/health")
def health_check():
    """API health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "total_customers": len(customers_db),
        "total_predictions": len(predictions_history)
    }