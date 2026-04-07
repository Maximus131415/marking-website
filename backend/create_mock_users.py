import sys
import os

# Ensure we can import from the backend directory
sys.path.append(r"C:\Users\Nitro\Desktop\backend")

from database import engine, SessionLocal
from models import Base, User
from auth import hash_password

# This will create the database file and tables if they don't exist
Base.metadata.create_all(bind=engine)

def create_users():
    db = SessionLocal()
    try:
        # Check if they exist to avoid duplicates
        existing_worker = db.query(User).filter(User.email == "worker@test.com").first()
        existing_customer = db.query(User).filter(User.email == "customer@test.com").first()

        if not existing_worker:
            worker = User(
                username="Тестовый Исполнитель",
                email="worker@test.com",
                hashed_password=hash_password("12345"),
                role="worker"
            )
            db.add(worker)
            
        if not existing_customer:
            customer = User(
                username="Тестовый Заказчик",
                email="customer@test.com",
                hashed_password=hash_password("12345"),
                role="customer"
            )
            db.add(customer)
            
        db.commit()
        
        # Now print all users
        users = db.query(User).all()
        print("\n--- ДАННЫЕ В БАЗЕ SQLITE ---")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Имя: {u.username} | Роль: {u.role}")
        print("----------------------------\n")
            
    finally:
        db.close()

if __name__ == "__main__":
    create_users()
    print("Успешно записано в базу SQLite!")
