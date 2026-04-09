from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import jwt
import datetime
from passlib.context import CryptContext

app = FastAPI(title="DataMark Auth API")

# Разрешаем фронтенду обращаться к бэкенду
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "super_secret_datamark_key" 
ALGORITHM = "HS256"

def get_db_connection():
    return psycopg2.connect(
        dbname="datamark_db",
        user="datamark",
        password="password",
        host="database"
    )

class UserRegister(BaseModel):
    username: str
    password: str
    role: str

class UserLogin(BaseModel):
    username: str
    password: str

# Функция проверки токена
def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/register")
def register(user: UserRegister):
    conn = get_db_connection()
    cur = conn.cursor()
    hashed_password = pwd_context.hash(user.password[:72])
    
    try:
        # По умолчанию у всех новых пользователей рейтинг 100% (1.0)
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

# НОВЫЙ ЭНДПОИНТ: Отдает данные пользователя (включая рейтинг)
@app.get("/users/me")
def get_me(user: dict = Depends(get_current_user)):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT username, role, accuracy FROM users WHERE id = %s", (user["user_id"],))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Если accuracy случайно пустое, отдаем 1.0
        accuracy = row[2] if row[2] is not None else 1.0
        return {"username": row[0], "role": row[1], "accuracy": accuracy}
    finally:
        cur.close()
        conn.close()