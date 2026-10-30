
import pandas as pd
import numpy as np
import joblib

from datetime import datetime
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error

# 1. Load dataset
df = pd.read_csv("sample_sales.csv")

df["date"] = pd.to_datetime(df["date"])
df = df.sort_values("date")

# 2. Create date features
df["day_of_week"] = df["date"].dt.dayofweek
df["month"] = df["date"].dt.month
df["day_of_year"] = df["date"].dt.dayofyear

# 3. Select input features
features = [
    "product_id",
    "category",
    "store_id",
    "promotion",
    "day_of_week",
    "month",
    "day_of_year"
]

X = pd.get_dummies(df[features])
y = df["units_sold"]

# 4. Split data by date
split_date = df["date"].quantile(0.8)

train_mask = df["date"] <= split_date
test_mask = df["date"] > split_date

X_train = X[train_mask]
X_test = X[test_mask]

y_train = y[train_mask]
y_test = y[test_mask]

# 5. Train Random Forest model
model = RandomForestRegressor(
    n_estimators=100,
    random_state=42,
    min_samples_leaf=2
)

model.fit(X_train, y_train)

# 6. Evaluate model
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)

print("\nMODEL TRAINING SUCCESSFUL!")
print("Mean Absolute Error:", round(mae, 2))

# 7. Save trained model
joblib.dump(
    {
        "model": model,
        "columns": list(X.columns),
        "features": features
    },
    "freshstock_model.pkl"
)

print("\nModel saved as freshstock_model.pkl")

# 8. Generate forecasts for the next 7 days
today = pd.Timestamp.today().normalize()

future_rows = []

for product_id in df["product_id"].unique():

    product_data = df[df["product_id"] == product_id]
    product = product_data.iloc[-1]

    for i in range(1, 8):

        future_date = today + pd.Timedelta(days=i)

        future_rows.append({
            "product_id": product_id,
            "category": product["category"],
            "store_id": product["store_id"],
            "promotion": 0,
            "day_of_week": future_date.dayofweek,
            "month": future_date.month,
            "day_of_year": future_date.dayofyear,
            "date": future_date
        })

future_df = pd.DataFrame(future_rows)

# Prepare future data for the model
future_X = pd.get_dummies(future_df[features])

future_X = future_X.reindex(
    columns=X.columns,
    fill_value=0
)

# Predict demand
future_predictions = model.predict(future_X)

future_df["predicted_demand"] = np.maximum(
    0, np.round(future_predictions)
).astype(int)

# 9. Save forecast results
future_df.to_csv("forecast_output.csv", index=False)

print("\nNEXT 7 DAYS FORECAST GENERATED!")
print(future_df[
    ["product_id", "date", "predicted_demand"]
].to_string(index=False))

print("\nSaved as forecast_output.csv")
