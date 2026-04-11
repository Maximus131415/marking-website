import pytest
import psycopg2
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app, calculate_iou

client = TestClient(app)

# ==========================================
# 1. ТЕСТИРОВАНИЕ БИЗНЕС-ЛОГИКИ (Математика)
# ==========================================

def test_calculate_iou_perfect_match():
    """Тест: рамки полностью совпадают"""
    box1 = {'x': 10, 'y': 10, 'w': 20, 'h': 20}
    box2 = {'x': 10, 'y': 10, 'w': 20, 'h': 20}
    assert calculate_iou(box1, box2) == 1.0

def test_calculate_iou_no_overlap():
    """Тест: рамки вообще не пересекаются"""
    box1 = {'x': 0, 'y': 0, 'w': 5, 'h': 5}
    box2 = {'x': 10, 'y': 10, 'w': 5, 'h': 5}
    assert calculate_iou(box1, box2) == 0.0

def test_calculate_iou_partial_overlap():
    """Тест: рамки пересекаются ровно наполовину"""
    box1 = {'x': 0, 'y': 0, 'w': 10, 'h': 10}   
    box2 = {'x': 0, 'y': 5, 'w': 10, 'h': 10}   
    iou = calculate_iou(box1, box2)
    assert 0.33 < iou < 0.34

# ==========================================
# 2. ТЕСТИРОВАНИЕ API (Изоляция БД и Шифрования)
# ==========================================

@patch('main.pwd_context.hash') # Отключаем реальное шифрование
@patch('main.get_db_connection') # Отключаем реальную БД
def test_register_user_success(mock_get_db, mock_hash):
    """Тест успешной регистрации нового пользователя"""
    mock_conn = MagicMock()
    mock_get_db.return_value = mock_conn
    mock_hash.return_value = "fake_hashed_password" # Заглушка для пароля
    
    response = client.post("/register", json={
        "username": "testuser",
        "password": "password123",
        "role": "worker"
    })
    
    assert response.status_code == 200
    assert response.json() == {"message": "User registered successfully"}
    mock_conn.cursor().execute.assert_called() 

@patch('main.pwd_context.hash')
@patch('main.get_db_connection')
def test_register_user_duplicate(mock_get_db, mock_hash):
    """Тест запрета регистрации с существующим логином"""
    mock_conn = MagicMock()
    mock_conn.cursor().execute.side_effect = psycopg2.errors.UniqueViolation()
    mock_get_db.return_value = mock_conn
    mock_hash.return_value = "fake_hashed_password"

    response = client.post("/register", json={
        "username": "existinguser",
        "password": "somepassword",
        "role": "worker"
    })
    
    assert response.status_code == 400
    assert "Username already exists" in response.json()["detail"]

@patch('main.pwd_context.verify')
@patch('main.get_db_connection')
def test_login_success(mock_get_db, mock_verify):
    """Тест успешного входа и получения токена"""
    mock_conn = MagicMock()
    mock_cursor = mock_conn.cursor()
    mock_cursor.fetchone.return_value = (1, "fake_hashed_password", "worker")
    mock_get_db.return_value = mock_conn
    mock_verify.return_value = True

    response = client.post("/login", json={
        "username": "testuser",
        "password": "password123"
    })
    
    assert response.status_code == 200
    assert "access_token" in response.json()

@patch('main.get_db_connection')
def test_login_invalid_password(mock_get_db):
    """Тест ошибки при неверном логине/пароле"""
    mock_conn = MagicMock()
    mock_cursor = mock_conn.cursor()
    mock_cursor.fetchone.return_value = None
    mock_get_db.return_value = mock_conn

    response = client.post("/login", json={
        "username": "wronguser",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401

def test_protected_route_without_token():
    """Тест: неавторизованный запрос к защищенному пути отклоняется"""
    response = client.get("/users/me")
    assert response.status_code == 401