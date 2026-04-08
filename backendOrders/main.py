from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import jwt
import json

app = FastAPI(title="DataMark Orders & Data API")

# Разрешаем фронтендам Ромы (3002) и Ильяра (3003) делать запросы сюда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "super_secret_datamark_key" # Обязательно такой же, как у Ражаббоя!
ALGORITHM = "HS256"

# Подключение к базе данных Олега
def get_db_connection():
    return psycopg2.connect(
        dbname="datamark_db",
        user="datamark",
        password="password",
        host="database"
    )

# --- МОДЕЛИ ДАННЫХ ---
class OrderCreate(BaseModel):
    title: str

class AnnotationCreate(BaseModel):
    image_id: int
    annotation_data: dict

# --- СИСТЕМА ПРОПУСКОВ (ЗАЩИТА РОУТОВ) ---
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        # Расшифровываем токен общим ключом
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload # Возвращает {"user_id": 1, "role": "customer", "exp": ...}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- ЭНДПОИНТЫ ---

# 1. Создание заказа (только для заказчиков)
@app.post("/orders")
def create_order(order: OrderCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create orders")
    
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Создаем заказ
        cur.execute(
            "INSERT INTO orders (title, customer_id, status) VALUES (%s, %s, 'open') RETURNING id",
            (order.title, user["user_id"])
        )
        order_id = cur.fetchone()[0]
        
        # ДЛЯ MVP: Автоматически создадим "пустую" картинку для этого заказа, 
        # чтобы Ильяру было что размечать
        cur.execute(
            "INSERT INTO images (order_id, image_url) VALUES (%s, %s) RETURNING id",
            (order_id, "https://dummyimage.com/600x400/ccc/000&text=Sample+Image")
        )
        
        conn.commit()
        return {"message": "Order created", "order_id": order_id}
    finally:
        cur.close()
        conn.close()

# 2. Получение списка заказов (для всех)
@app.get("/orders")
def get_orders(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Исполнители видят все открытые заказы, заказчики — только свои
    if user.get("role") == "worker":
        cur.execute("SELECT id, title, status FROM orders WHERE status = 'open'")
    else:
        cur.execute("SELECT id, title, status FROM orders WHERE customer_id = %s", (user["user_id"],))
        
    orders = [{"id": row[0], "title": row[1], "status": row[2]} for row in cur.fetchall()]
    
    cur.close()
    conn.close()
    return orders

# 3. Сохранение разметки от Ильяра (только исполнители)
@app.post("/annotations")
def save_annotation(annotation: AnnotationCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Only workers can submit annotations")
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Сохраняем JSON с координатами (bounding boxes)
        cur.execute(
            "INSERT INTO annotations (image_id, worker_id, annotation_data) VALUES (%s, %s, %s)",
            (annotation.image_id, user["user_id"], json.dumps(annotation.annotation_data))
        )
        conn.commit()
        return {"message": "Annotation saved successfully"}
    finally:
        cur.close()
        conn.close()
