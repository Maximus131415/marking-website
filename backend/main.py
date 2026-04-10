import os
import json
import shutil
import zipfile
import uuid
import re
import datetime
import psycopg2
import jwt

from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from passlib.context import CryptContext

app = FastAPI(title="DataMark API Monolith")

# Создаем папку для загрузок и раздаем статику
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "super_secret_datamark_key"
ALGORITHM = "HS256"

BASE_URL = os.getenv("PUBLIC_URL", "") 

def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        dbname="datamark_db",
        user="datamark",
        password="password",
        host="database"
    )

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_iou(boxA, boxB):
    try:
        xA, yA = max(boxA['x'], boxB['x']), max(boxA['y'], boxB['y'])
        xB, yB = min(boxA['x'] + boxA['w'], boxB['x'] + boxB['w']), min(boxA['y'] + boxA['h'], boxB['y'] + boxB['h'])
        interArea = max(0, xB - xA) * max(0, yB - yA)
        boxAArea, boxBArea = boxA['w'] * boxA['h'], boxB['w'] * boxB['h']
        return interArea / float(boxAArea + boxBArea - interArea) if (boxAArea + boxBArea - interArea) > 0 else 0
    except: return 0

# --- МОДЕЛИ ДАННЫХ ---
class UserRegister(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

class PublishData(BaseModel): 
    honeypots: dict

# --- ЭНДПОИНТЫ АВТОРИЗАЦИИ И ПОЛЬЗОВАТЕЛЕЙ ---
@app.post("/register")
def register(user: UserRegister):
    conn = get_db_connection()
    cur = conn.cursor()
    hashed_password = pwd_context.hash(user.password[:72])
    
    try:
        cur.execute(
            "INSERT INTO users (username, password_hash, role, accuracy) VALUES (%s, %s, %s, 1.0)",
            (user.username, hashed_password, user.role)
        )
        conn.commit()
        return {"message": "User registered successfully"}
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        cur.close()
        conn.close()

@app.post("/login")
def login(user: UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT id, password_hash, role FROM users WHERE username = %s", (user.username,))
    record = cur.fetchone()
    
    if not record or not pwd_context.verify(user.password, record[1]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    payload = {
        "user_id": record[0],
        "role": record[2],
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": record[2]
    }

@app.get("/users/me")
def get_me(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT username, role, accuracy FROM users WHERE id = %s", (user["user_id"],))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        accuracy = row[2] if row[2] is not None else 1.0
        return {"username": row[0], "role": row[1], "accuracy": accuracy}
    finally:
        cur.close()
        conn.close()

# --- ЭНДПОИНТЫ ЗАКАЗОВ И РАЗМЕТКИ ---
@app.get("/orders")
def get_orders(filter_type: str = "open", user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        orders = []
        if user.get("role") == "worker":
            if filter_type == "my_tasks":
                cur.execute("""
                    SELECT id, title, status, task_type, 
                           (SELECT COUNT(*) FROM images WHERE order_id = orders.id) as image_count,
                           (SELECT COUNT(DISTINCT image_id) FROM annotations WHERE order_id = orders.id AND worker_id = %s) as my_annotated_count
                    FROM orders WHERE id IN (SELECT order_id FROM order_workers WHERE worker_id = %s)
                """, (user["user_id"], user["user_id"]))
            else:
                cur.execute("""
                    SELECT id, title, status, task_type, 
                           (SELECT COUNT(*) FROM images WHERE order_id = orders.id) as image_count, 0
                    FROM orders WHERE (status = 'open' OR status = 'in_progress')
                      AND id NOT IN (SELECT order_id FROM order_workers WHERE worker_id = %s)
                """, (user["user_id"],))
            
            for row in cur.fetchall():
                is_completed = (row[4] > 0 and row[5] >= row[4])
                orders.append({"id": row[0], "title": row[1], "status": row[2], "task_type": row[3], "image_count": row[4], "is_my_completed": is_completed})
            return orders
        else:
            cur.execute("""
                SELECT id, title, status, task_type, overlap_count,
                       (SELECT COUNT(*) FROM images WHERE order_id = orders.id) as image_count,
                       (SELECT COUNT(*) FROM images i2 WHERE i2.order_id = orders.id AND 
                         (SELECT COUNT(*) FROM annotations a WHERE a.image_id = i2.id) >= orders.overlap_count) as completed_images
                FROM orders WHERE customer_id = %s
            """, (user["user_id"],))
            
            grouped = {}
            for row in cur.fetchall():
                base_title = re.sub(r' \(Часть \d+\)$', '', row[1])
                if base_title not in grouped:
                    grouped[base_title] = {"id": row[0], "title": base_title, "task_type": row[3], "image_count": 0, "completed_images": 0}
                grouped[base_title]["image_count"] += row[5]
                grouped[base_title]["completed_images"] += row[6]

            for data in grouped.values():
                data["progress"] = int((data["completed_images"] / data["image_count"]) * 100) if data["image_count"] > 0 else 0
                data["status"] = "completed" if data["progress"] >= 100 else "in_progress" if data["progress"] > 0 else "open"
                orders.append(data)
            return orders
    finally: cur.close(); conn.close()

@app.post("/orders/{order_id}/take")
def take_order(order_id: int, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO order_workers (order_id, worker_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (order_id, user["user_id"]))
        cur.execute("UPDATE orders SET status = 'in_progress' WHERE id = %s AND status = 'open'", (order_id,))
        conn.commit()
        return {"message": "Взято в работу"}
    finally: cur.close(); conn.close()

@app.post("/orders/draft")
async def create_draft_order(
    title: str = Form(...), task_type: str = Form(...), description: str = Form(""),
    classes: str = Form(...), overlap_count: int = Form(1),
    archive: Optional[UploadFile] = File(None), images: Optional[List[UploadFile]] = File(None),
    user: dict = Depends(get_current_user)
):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO orders (customer_id, title, status, task_type, description, classes, overlap_count) VALUES (%s, %s, 'draft', %s, %s, %s, %s) RETURNING id",
            (user["user_id"], title, task_type, description, classes, overlap_count)
        )
        order_id = cur.fetchone()[0]
        saved_images = []

        if archive and archive.filename and archive.filename.lower().endswith('.zip'):
            temp_zip_path = f"uploads/temp_{uuid.uuid4().hex}.zip"
            try:
                with open(temp_zip_path, "wb") as buffer: shutil.copyfileobj(archive.file, buffer)
                with zipfile.ZipFile(temp_zip_path, 'r') as z:
                    for filename in z.namelist():
                        if filename.endswith('/') or '__MACOSX' in filename or not filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.bmp')): continue
                        ext = filename.split('.')[-1]; safe_filename = f"{uuid.uuid4().hex}.{ext}"; file_location = f"uploads/{order_id}_{safe_filename}"
                        with open(file_location, "wb") as f: f.write(z.read(filename))
                        cur.execute("INSERT INTO images (order_id, file_path) VALUES (%s, %s) RETURNING id", (order_id, file_location))
                        saved_images.append({"id": cur.fetchone()[0], "url": f"{BASE_URL}/{file_location}"})
            finally:
                if os.path.exists(temp_zip_path): os.remove(temp_zip_path)
        
        if images:
            for image in images:
                if not getattr(image, "filename", None): continue
                ext = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'; safe_filename = f"{uuid.uuid4().hex}.{ext}"; file_location = f"uploads/{order_id}_{safe_filename}"
                with open(file_location, "wb") as buffer: shutil.copyfileobj(image.file, buffer)
                cur.execute("INSERT INTO images (order_id, file_path) VALUES (%s, %s) RETURNING id", (order_id, file_location))
                saved_images.append({"id": cur.fetchone()[0], "url": f"{BASE_URL}/{file_location}"})

        conn.commit()
        return {"order_id": order_id, "images": saved_images}
    finally: cur.close(); conn.close()

@app.post("/orders/{order_id}/publish")
def publish_order(order_id: int, data: PublishData, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        for img_id_str, label in data.honeypots.items():
            cur.execute("UPDATE images SET is_honeypot = TRUE, true_label = %s WHERE id = %s", (json.dumps(label) if isinstance(label, list) else label, int(img_id_str)))

        MAX_PER_ORDER = 100
        cur.execute("SELECT id FROM images WHERE order_id = %s ORDER BY id", (order_id,))
        all_image_ids = [row[0] for row in cur.fetchall()]
        
        if len(all_image_ids) > MAX_PER_ORDER:
            cur.execute("SELECT customer_id, title, task_type, description, classes, overlap_count FROM orders WHERE id = %s", (order_id,))
            o = cur.fetchone()
            for i in range(MAX_PER_ORDER, len(all_image_ids), MAX_PER_ORDER):
                chunk_ids = all_image_ids[i:i + MAX_PER_ORDER]
                cur.execute("INSERT INTO orders (customer_id, title, status, task_type, description, classes, overlap_count) VALUES (%s, %s, 'open', %s, %s, %s, %s) RETURNING id",
                    (o[0], f"{o[1]} (Часть {(i // MAX_PER_ORDER) + 1})", o[2], o[3], o[4], o[5]))
                new_id = cur.fetchone()[0]
                cur.execute(f"UPDATE images SET order_id = %s WHERE id IN ({','.join(['%s']*len(chunk_ids))})", [new_id] + chunk_ids)
            cur.execute("UPDATE orders SET title = %s WHERE id = %s", (f"{o[1]} (Часть 1)", order_id))

        cur.execute("UPDATE orders SET status = 'open' WHERE id = %s", (order_id,))
        conn.commit()
        return {"message": "Заказ опубликован!"}
    finally: cur.close(); conn.close()

@app.post("/annotations")
async def save_annotation(data: dict, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO annotations (image_id, order_id, worker_id, label_data) VALUES (%s, %s, %s, %s)", (data['image_id'], data['order_id'], user['user_id'], json.dumps(data['annotation_data'])))
        
        cur.execute("SELECT is_honeypot, true_label FROM images WHERE id = %s", (data['image_id'],))
        img_row = cur.fetchone()
        if img_row and img_row[0]: 
            try: true_label = json.loads(img_row[1]) 
            except: true_label = img_row[1]
            sub_labels = {item.get('label') for item in data['annotation_data'] if isinstance(item, dict)}
            
            is_correct = (set(true_label).issubset(sub_labels)) if isinstance(true_label, list) else (true_label in sub_labels)
            
            cur.execute("SELECT accuracy FROM users WHERE id = %s", (user['user_id'],))
            current_acc = float(cur.fetchone()[0] or 1.0)
            alpha = 0.15 if not is_correct else 0.02
            cur.execute("UPDATE users SET accuracy = %s WHERE id = %s", (max(0.0, min(1.0, current_acc * (1 - alpha) + (1.0 if is_correct else 0.0) * alpha)), user['user_id']))

        cur.execute("SELECT overlap_count FROM orders WHERE id = %s", (data['order_id'],))
        overlap = cur.fetchone()[0] or 1
        cur.execute("SELECT COUNT(*) FROM annotations WHERE order_id = %s", (data['order_id'],))
        annotated_count = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM images WHERE order_id = %s", (data['order_id'],))
        if annotated_count >= (cur.fetchone()[0] * overlap):
            cur.execute("UPDATE orders SET status = 'completed' WHERE id = %s", (data['order_id'],))
        conn.commit()
        return {"status": "success"}
    finally: cur.close(); conn.close()



@app.get("/orders/{order_id}/export")
def export_results(order_id: int, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Проверяем права и очищаем название (оставляем твою логику склейки частей)
        cur.execute("SELECT title FROM orders WHERE id = %s AND customer_id = %s", (order_id, user['user_id']))
        o_row = cur.fetchone()
        if not o_row: 
            raise HTTPException(status_code=403, detail="Доступ запрещен")
        base_title = re.sub(r' \(Часть \d+\)$', '', o_row[0])

        # 2. Ищем все части заказа
        cur.execute("SELECT id FROM orders WHERE customer_id = %s AND title LIKE %s", (user['user_id'], base_title + '%'))
        order_ids = tuple([r[0] for r in cur.fetchall()])

        # 3. Достаем изображения и сырую разметку (LEFT JOIN, чтобы отдать даже неразмеченные фото)
        cur.execute("""
            SELECT i.id, i.file_path, a.worker_id, a.label_data
            FROM images i 
            LEFT JOIN annotations a ON i.id = a.image_id 
            WHERE i.order_id IN %s
        """, (order_ids,))
        
        results_map = {}
        for row in cur.fetchall():
            img_id = row[0]
            file_path = row[1]
            worker_id = row[2]
            label_data = row[3]

            if img_id not in results_map:
                # Очищаем имя файла (например, "uploads/8_test.jpg" -> "8_test.jpg")
                clean_filename = os.path.basename(file_path)
                
                # Если препод просит убрать даже технический префикс вроде "8_", раскомментируй строку ниже:
                # clean_filename = clean_filename.split('_', 1)[-1] if '_' in clean_filename else clean_filename

                results_map[img_id] = {
                    "filename": clean_filename, 
                    "worker_annotations": []
                }
            
            # Если для картинки есть разметка, добавляем ее в список
            if worker_id is not None and label_data:
                results_map[img_id]["worker_annotations"].append({
                    "worker_id": worker_id,
                    "data": json.loads(label_data)
                })

        # 4. Превращаем словарь в финальный список
        final_results = [
            {
                "image_id": img_id, 
                "filename": item["filename"], 
                "worker_annotations": item["worker_annotations"]
            } 
            for img_id, item in results_map.items()
        ]
                
        return {"order_title": base_title, "data": final_results}
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
        return {"id": row[0], "title": row[1], "task_type": row[2], "classes": json.loads(row[3]) if row[3] else {}}
    finally: cur.close(); conn.close()

@app.get("/orders/{order_id}/images")
def get_order_images(order_id: int, user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT i.id, i.file_path, 
                   EXISTS(SELECT 1 FROM annotations a WHERE a.image_id = i.id AND a.worker_id = %s) as is_done
            FROM images i 
            WHERE i.order_id = %s 
            ORDER BY i.id
        """, (user['user_id'], order_id))
        return [{"id": row[0], "url": f"{BASE_URL}/{row[1]}", "isDone": row[2]} for row in cur.fetchall()]
    finally: cur.close(); conn.close()