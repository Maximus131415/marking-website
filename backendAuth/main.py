from fastapi import FastAPI, HTTPException, Depends
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

# Настройка шифрования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "super_secret_datamark_key"
ALGORITHM = "HS256"

# Подключение к базе Олега
def get_db_connection():
    return psycopg2.connect(
        dbname="datamark_db",
        user="datamark",
        password="password",
        host="database" # Имя сервиса в docker-compose
    )

# Модели данных
class UserRegister(BaseModel):
    username: str
    password: str
    role: str # 'customer' или 'worker'

class UserLogin(BaseModel):
    username: str
    password: str

# 1. Эндпоинт Регистрации
@app.post("/register")
def register(user: UserRegister):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Хешируем пароль перед сохранением
    hashed_password = pwd_context.hash(user.password[:72])
    
    try:
        cur.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
            (user.username, hashed_password, user.role)
        )
        conn.commit()
        return {"message": "User registered successfully"}
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(status_code=400, detail="Username already exists")
    finally:
        cur.close()
        conn.close()

# 2. Эндпоинт Входа (Выдача JWT)
@app.post("/login")
def login(user: UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute("SELECT id, password_hash, role FROM users WHERE username = %s", (user.username,))
    record = cur.fetchone()
    
    if not record or not pwd_context.verify(user.password, record[1]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Создаем токен на 24 часа
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