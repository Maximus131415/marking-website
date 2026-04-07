from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
import models
from routers import auth

# Создаём таблицы в БД при старте (если их ещё нет)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DataLabeling API")

# Разрешаем запросы с фронтенда (Vite dev server на 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)


@app.get("/")
def root():
    return {"message": "API работает. Документация: /docs"}
