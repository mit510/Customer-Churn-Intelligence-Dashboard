import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.metrics import accuracy_score, roc_auc_score, classification_report
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

# ===============================
# 1️⃣ Load Data
# ===============================

df = pd.read_csv("data/telco.csv")

# Remove customerID if exists
if "customerID" in df.columns:
    df.drop("customerID", axis=1, inplace=True)

# Fix TotalCharges (sometimes blank)
df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
df["TotalCharges"] = df["TotalCharges"].fillna(df["TotalCharges"].median())

# Convert target to binary
df["Churn"] = df["Churn"].map({"Yes": 1, "No": 0})

# ===============================
# 2️⃣ Split Features / Target
# ===============================

X = df.drop("Churn", axis=1)
y = df["Churn"]

# Identify column types
categorical_cols = X.select_dtypes(include=["object", "string"]).columns
numeric_cols = X.select_dtypes(exclude="object").columns

# ===============================
# 3️⃣ Preprocessing Pipeline
# ===============================

preprocessor = ColumnTransformer(
    transformers=[
        ("num", StandardScaler(), numeric_cols),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols),
    ]
)

# ===============================
# 4️⃣ Models
# ===============================

rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=8,
    random_state=42
)

xgb_model = XGBClassifier(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    eval_metric="logloss"
)

# ===============================
# 5️⃣ Train-Test Split
# ===============================

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ===============================
# 6️⃣ Train Random Forest
# ===============================

rf_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", rf_model)
    ]
)

rf_pipeline.fit(X_train, y_train)

rf_preds = rf_pipeline.predict(X_test)
rf_probs = rf_pipeline.predict_proba(X_test)[:, 1]

print("===== Random Forest =====")
print("Accuracy:", accuracy_score(y_test, rf_preds))
print("ROC-AUC:", roc_auc_score(y_test, rf_probs))
print(classification_report(y_test, rf_preds))

# ===============================
# 7️⃣ Train XGBoost
# ===============================

xgb_pipeline = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", xgb_model)
    ]
)

xgb_pipeline.fit(X_train, y_train)

xgb_preds = xgb_pipeline.predict(X_test)
xgb_probs = xgb_pipeline.predict_proba(X_test)[:, 1]

print("===== XGBoost =====")
print("Accuracy:", accuracy_score(y_test, xgb_preds))
print("ROC-AUC:", roc_auc_score(y_test, xgb_probs))
print(classification_report(y_test, xgb_preds))

# ===============================
# 8️⃣ Save Best Model (Based on ROC-AUC)
# ===============================

rf_auc = roc_auc_score(y_test, rf_probs)
xgb_auc = roc_auc_score(y_test, xgb_probs)

best_model = rf_pipeline if rf_auc > xgb_auc else xgb_pipeline

joblib.dump(best_model, "model/churn_model.pkl")

print("\nBest model saved successfully!")
