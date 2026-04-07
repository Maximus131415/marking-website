from sqlalchemy import Column, Integer, String
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(60), unique=True, nullable=False) # Из DataBase4.sql
    user_role = Column(String(60), default="worker")           # Из DataBase4.sql
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)      # Из DataBase4.sql