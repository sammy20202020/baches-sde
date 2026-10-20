"""RF-01, RF-02, RF-03 y RNF-01."""
from app.models.user import Rol


def test_registro_exige_consentimiento(client):
    """RF-01: sin aceptar la politica de privacidad no se crea la cuenta."""
    r = client.post(
        "/api/v1/auth/registro",
        json={
            "nombre": "Ana Perez",
            "email": "ana@baches.example.com",
            "password": "clave-larga-2026",
            "acepta_privacidad": False,
        },
    )
    assert r.status_code == 422


def test_registro_y_login(client):
    datos = {
        "nombre": "Ana Perez",
        "email": "ana@baches.example.com",
        "password": "clave-larga-2026",
        "acepta_privacidad": True,
    }
    r = client.post("/api/v1/auth/registro", json=datos)
    assert r.status_code == 201, r.text
    assert r.json()["rol"] == "ciudadano"
    assert "password" not in r.text and "hash" not in r.text

    r = client.post(
        "/api/v1/auth/login", json={"email": datos["email"], "password": datos["password"]}
    )
    assert r.status_code == 200
    assert {"access_token", "refresh_token"} <= r.json().keys()


def test_login_con_clave_incorrecta_no_revela_si_existe(client, crear_usuario):
    usuario = crear_usuario()
    r1 = client.post(
        "/api/v1/auth/login", json={"email": usuario.email, "password": "incorrecta"}
    )
    r2 = client.post(
        "/api/v1/auth/login",
        json={"email": "nadie@baches.example.com", "password": "incorrecta"},
    )
    assert r1.status_code == r2.status_code == 401
    assert r1.json() == r2.json()


def test_refresh_token_se_revoca_al_usarse(client, crear_usuario):
    """RNF-01: los refresh tokens son rotativos."""
    usuario = crear_usuario()
    r = client.post(
        "/api/v1/auth/login",
        json={"email": usuario.email, "password": "clave-de-prueba-2026"},
    )
    viejo = r.json()["refresh_token"]

    assert client.post("/api/v1/auth/refresh", json={"refresh_token": viejo}).status_code == 200
    # Reusar el mismo refresh ya no debe funcionar.
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": viejo}).status_code == 401


def test_sin_token_no_hay_acceso(client):
    assert client.get("/api/v1/reportes/mios").status_code == 401


def test_rol_ciudadano_no_puede_revisar(client, token):
    """RF-03: la autorizacion se valida en el servidor."""
    t = token(Rol.CIUDADANO)
    r = client.get("/api/v1/revision/pendientes", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 403


def test_rol_revisor_si_puede_revisar(client, token):
    t = token(Rol.REVISOR)
    r = client.get("/api/v1/revision/pendientes", headers={"Authorization": f"Bearer {t}"})
    assert r.status_code == 200


def test_access_token_no_sirve_como_refresh(client, token):
    t = token()
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": t}).status_code == 401
