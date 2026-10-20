"""RF-04, RF-05, RF-08, RF-09, RF-11: ciclo del reporte ciudadano."""
import uuid

from app.models.user import Rol

COORD_SDE = {"lat": "18.4861", "lon": "-69.8570"}


def _crear(client, token_str: str, foto: bytes, clave: str | None = None, **campos):
    clave = clave or str(uuid.uuid4())
    datos = {**COORD_SDE, **campos}
    return client.post(
        "/api/v1/reportes",
        headers={"Authorization": f"Bearer {token_str}", "Idempotency-Key": clave},
        files={"foto": ("bache.jpg", foto, "image/jpeg")},
        data=datos,
    )


def test_crear_reporte(client, token, foto_jpeg):
    t = token()
    r = _crear(client, t, foto_jpeg, descripcion="Bache en Av. Espana")
    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["estado"] == "recibido"
    assert cuerpo["publicado_en"] is None  # nada se publica sin revision humana
    assert abs(cuerpo["lat"] - 18.4861) < 1e-6
    assert abs(cuerpo["lon"] - (-69.8570)) < 1e-6


def test_idempotencia_no_duplica(client, token, foto_jpeg):
    """RF-08: el reintento de la cola offline devuelve el mismo reporte."""
    t = token()
    clave = str(uuid.uuid4())
    r1 = _crear(client, t, foto_jpeg, clave=clave)
    r2 = _crear(client, t, foto_jpeg, clave=clave)
    assert r1.status_code == 201
    assert r2.json()["id"] == r1.json()["id"]

    historial = client.get(
        "/api/v1/reportes/mios", headers={"Authorization": f"Bearer {t}"}
    ).json()
    assert len(historial) == 1


def test_falta_idempotency_key(client, token, foto_jpeg):
    t = token()
    r = client.post(
        "/api/v1/reportes",
        headers={"Authorization": f"Bearer {t}"},
        files={"foto": ("bache.jpg", foto_jpeg, "image/jpeg")},
        data=COORD_SDE,
    )
    assert r.status_code == 400


def test_coordenada_fuera_de_sde(client, token, foto_jpeg):
    """RF-05: coherencia geografica."""
    t = token()
    r = _crear(client, t, foto_jpeg, lat="40.7128", lon="-74.0060")
    assert r.status_code == 422


def test_archivo_no_imagen(client, token):
    """RF-05: validacion de tipo."""
    t = token()
    r = client.post(
        "/api/v1/reportes",
        headers={"Authorization": f"Bearer {t}", "Idempotency-Key": str(uuid.uuid4())},
        files={"foto": ("script.txt", b"<?php echo 1; ?>", "text/plain")},
        data=COORD_SDE,
    )
    assert r.status_code == 415


def test_gps_impreciso_se_marca(client, token, foto_jpeg):
    """El revisor debe poder corregir lo que el GPS ubico mal."""
    t = token()
    r = _crear(client, t, foto_jpeg, precision_gps_m="120")
    assert r.json()["requiere_correccion_gps"] is True


def test_historial_solo_muestra_lo_propio(client, token, foto_jpeg):
    """RF-09 + RNF-02."""
    t1, t2 = token(), token()
    _crear(client, t1, foto_jpeg)
    historial = client.get(
        "/api/v1/reportes/mios", headers={"Authorization": f"Bearer {t2}"}
    ).json()
    assert historial == []


def test_mapa_publico_no_expone_datos_personales(client, token, foto_jpeg, crear_usuario):
    """RNF-02: el mapa publico nunca trae correo, nombre ni autor."""
    t = token()
    _crear(client, t, foto_jpeg)

    # Sin validar, el mapa esta vacio (principio de publicacion, pag. 7).
    assert client.get("/api/v1/mapa/publico").json()["features"] == []

    revisor = crear_usuario(Rol.REVISOR)
    tr = client.post(
        "/api/v1/auth/login",
        json={"email": revisor.email, "password": "clave-de-prueba-2026"},
    ).json()["access_token"]
    reporte_id = client.get(
        "/api/v1/reportes/mios", headers={"Authorization": f"Bearer {t}"}
    ).json()[0]["id"]
    r = client.post(
        f"/api/v1/revision/{reporte_id}",
        headers={"Authorization": f"Bearer {tr}"},
        json={
            "decision": "validar",
            "severidad_validada": "grave",
            "motivo": "Confirmado en la fotografia",
        },
    )
    assert r.status_code == 200

    mapa = client.get("/api/v1/mapa/publico").json()
    assert len(mapa["features"]) == 1
    props = mapa["features"][0]["properties"]
    assert set(props) == {
        "id",
        "estado",
        "severidad",
        "prioridad",
        "veces_reportado",
        "fecha",
        "publicado_en",
    }
    texto = client.get("/api/v1/mapa/publico").text
    assert "@" not in texto and "autor" not in texto
