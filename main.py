from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import jwt
import json
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
import os
import shutil
from fastapi.staticfiles import StaticFiles
import json

app = FastAPI(title="DataMark Orders & Data API")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "super_secret_datamark_key" 
ALGORITHM = "HS256"

def get_db_connection():
    return psycopg2.connect(
        dbname="datamark_db",
        user="datamark",
        password="password",
        host="database"
    )

# --- МОДЕЛИ ДАННЫХ 
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
        
        cur.execute(
            "INSERT INTO images (order_id, image_url) VALUES (%s, %s) RETURNING id",
            (order_id, "https://dummyimage.com/600x400/ccc/000&text=Sample+Image")
        )
        
        conn.commit()
        return {"message": "Order created", "order_id": order_id}
    finally:
        cur.close()
        conn.close()
# 1. Функция получения заказов
@app.get("/orders")
def get_orders(filter_type: str = "open", user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # SQL-запрос, который сразу считает количество картинок
        base_query = """
            SELECT o.id, o.title, o.status, o.task_type, COUNT(i.id) as image_count 
            FROM orders o 
            LEFT JOIN images i ON o.id = i.order_id 
        """
        
        if user.get("role") == "worker":
            if filter_type == "my_tasks":
                # Задачи, которые взял этот конкретный исполнитель
                cur.execute(base_query + " WHERE o.worker_id = %s GROUP BY o.id", (user["user_id"],))
            else:
                # Биржа: только открытые задачи
                cur.execute(base_query + " WHERE o.status = 'open' GROUP BY o.id")
        else:
            # Заказчику отдаем только его созданные заказы
            cur.execute(base_query + " WHERE o.customer_id = %s GROUP BY o.id", (user["user_id"],))
            
        records = cur.fetchall()
        
        orders = []
        for row in records:
            orders.append({
                "id": row[0],
                "title": row[1],
                "status": row[2],
                "task_type": row[3],
                "image_count": row[4] # Отдаем точное число картинок
            })
        return orders
    finally:
        cur.close()
        conn.close()


@app.post("/orders/{order_id}/take")
def take_order(order_id: int, user: dict = Depends(get_current_user)):
    if user.get("role") != "worker":
        raise HTTPException(status_code=403, detail="Только исполнители могут брать заказы")
        
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Меняем статус и записываем ID исполнителя
        cur.execute(
            "UPDATE orders SET status = 'in_progress', worker_id = %s WHERE id = %s AND status = 'open' RETURNING id", 
            (user["user_id"], order_id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail="Заказ уже взят кем-то другим или не существует")
        
        conn.commit()
        return {"message": "Заказ успешно взят в работу"}
    finally:
        cur.close()
        conn.close()
# 2. Функция создания заказа (Теперь сохраняем ID создателя)
@app.post("/orders/create_with_images")
async def create_order_with_images(
    title: str = Form(...),
    task_type: str = Form(...),
    description: str = Form(""),
    classes: str = Form(...), 
    images: list[UploadFile] = File(...),
    user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Сохраняем заказ с привязкой к customer_id
        cur.execute(
            "INSERT INTO orders (customer_id, title, status, task_type, description, classes) VALUES (%s, %s, 'open', %s, %s, %s) RETURNING id",
            (user["user_id"], title, task_type, description, classes)
        )
        order_id = cur.fetchone()[0]

        for image in images:
            file_location = f"uploads/{order_id}_{image.filename}"
            with open(file_location, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            cur.execute(
                "INSERT INTO images (order_id, file_path) VALUES (%s, %s)",
                (order_id, file_location)
            )

        conn.commit()
        return {"message": "Заказ успешно опубликован!", "order_id": order_id}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.post("/annotations")
async def save_annotation(data: dict, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Сохраняем разметку
        cur.execute(
            "INSERT INTO annotations (image_id, order_id, worker_id, label_data) VALUES (%s, %s, %s, %s)",
            (data['image_id'], data['order_id'], user['user_id'], json.dumps(data['annotation_data']))
        )
        
        # ПРОВЕРКА: Сколько картинок уже размечено в этом заказе?
        cur.execute("SELECT COUNT(*) FROM annotations WHERE order_id = %s", (data['order_id'],))
        annotated_count = cur.fetchone()[0]
        
        # Сколько всего картинок в заказе?
        cur.execute("SELECT COUNT(*) FROM images WHERE order_id = %s", (data['order_id'],))
        total_count = cur.fetchone()[0]
        
        # Если все размечены — меняем статус на 'completed'
        if annotated_count >= total_count:
            cur.execute("UPDATE orders SET status = 'completed' WHERE id = %s", (data['order_id'],))
        
        conn.commit()
        return {"status": "success"}
    finally:
        cur.close()
        conn.close()

# 2. Экспорт данных для Заказчика
@app.get("/orders/{order_id}/export")
def export_results(order_id: int, user: dict = Depends(get_current_user)):
    # Только заказчик этого проекта может скачать данные
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM orders WHERE id = %s AND customer_id = %s", (order_id, user['user_id']))
        if not cur.fetchone():
            raise HTTPException(status_code=403, detail="Доступ запрещен")

        # Собираем все данные разметки
        cur.execute("""
            SELECT i.id, i.file_path, a.label_data 
            FROM images i 
            JOIN annotations a ON i.id = a.image_id 
            WHERE i.order_id = %s
        """, (order_id,))
        
        results = []
        for row in cur.fetchall():
            results.append({
                "image_id": row[0],
                "file_url": f"http://localhost:8002/{row[1]}",
                "labeling_result": json.loads(row[2])
            })
        return {"order_id": order_id, "data": results}
    finally:
        cur.close()
        conn.close()


@app.get("/orders/{order_id}")
def get_order_details(order_id: int, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id, title, task_type, classes FROM orders WHERE id = %s", (order_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        
        return {
            "id": row[0],
            "title": row[1],
            "task_type": row[2],
            "classes": json.loads(row[3]) if row[3] else []
        }
    finally:
        cur.close()
        conn.close()

@app.get("/orders/{order_id}/images")
def get_order_images(order_id: int, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Получаем картинки.
        cur.execute("SELECT id, file_path FROM images WHERE order_id = %s", (order_id,))
        records = cur.fetchall()
        
        images = []
        for row in records:
            # Превращаем локальный путь в URL, который поймет React
            image_url = f"http://localhost:8002/{row[1]}" 
            images.append({"id": row[0], "url": image_url})
            
        return images
    finally:
        cur.close()
        conn.close()