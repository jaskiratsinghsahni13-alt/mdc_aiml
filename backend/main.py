from contextlib import asynccontextmanager
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DB_PATH = Path(__file__).parent / "freshstock.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                sku TEXT NOT NULL UNIQUE,
                stock INTEGER NOT NULL DEFAULT 0,
                unit TEXT NOT NULL DEFAULT 'units',
                expiry TEXT NOT NULL,
                demand REAL NOT NULL DEFAULT 0,
                cost REAL NOT NULL DEFAULT 0
            )
        """)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="FreshStock AI API",
    description="Inventory management backend for grocery and medical stores",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    category: str = Field(min_length=1, max_length=80)
    sku: str = Field(min_length=1, max_length=80)
    stock: int = Field(ge=0)
    unit: str = Field(min_length=1, max_length=30)
    expiry: str
    demand: float = Field(default=0, ge=0)
    cost: float = Field(default=0, ge=0)


@app.get("/")
def home():
    return {
        "message": "FreshStock AI backend is running!",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/products")
def get_products():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM products ORDER BY id DESC"
        ).fetchall()

    return [dict(row) for row in rows]


@app.post("/products", status_code=201)
def create_product(product: ProductCreate):
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO products
                (name, category, sku, stock, unit, expiry, demand, cost)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    product.name.strip(),
                    product.category,
                    product.sku.strip(),
                    product.stock,
                    product.unit,
                    product.expiry,
                    product.demand,
                    product.cost,
                ),
            )

            product_id = cursor.lastrowid

            row = connection.execute(
                "SELECT * FROM products WHERE id = ?",
                (product_id,),
            ).fetchone()

        return dict(row)

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="This SKU already exists. Use a unique product code.",
        )


@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductCreate):
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                UPDATE products
                SET name=?, category=?, sku=?, stock=?,
                    unit=?, expiry=?, demand=?, cost=?
                WHERE id=?
                """,
                (
                    product.name.strip(),
                    product.category,
                    product.sku.strip(),
                    product.stock,
                    product.unit,
                    product.expiry,
                    product.demand,
                    product.cost,
                    product_id,
                ),
            )

            if cursor.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Product not found",
                )

            row = connection.execute(
                "SELECT * FROM products WHERE id=?",
                (product_id,),
            ).fetchone()

        return dict(row)

    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=409,
            detail="This SKU already belongs to another product.",
        )


@app.delete("/products/{product_id}")
def delete_product(product_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM products WHERE id=?",
            (product_id,),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Product not found",
            )

    return {"message": "Product deleted successfully"}


@app.get("/dashboard")
def dashboard():
    with get_connection() as connection:
        result = connection.execute("""
            SELECT
                COUNT(*) AS total_products,
                COALESCE(SUM(stock), 0) AS total_units,
                COALESCE(SUM(CASE WHEN stock < 30 THEN 1 ELSE 0 END), 0)
                    AS low_stock_items
            FROM products
        """).fetchone()

    return dict(result)

@app.get("/ml-forecast")
def get_ml_forecast():
    import pandas as pd
    from pathlib import Path
    from fastapi import HTTPException

    file_path = Path(__file__).parent / "forecast_output.csv"

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="ML forecast file not found. Train the model first."
        )

    df = pd.read_csv(file_path)

    return df.to_dict(orient="records")