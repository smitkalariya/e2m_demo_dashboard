MANAGER_PAYLOAD = {"name": "Mona Manager", "email": "manager@example.com", "password": "supersecret123"}
USER_PAYLOAD = {"name": "Ulysses User", "email": "user@example.com", "password": "supersecret123"}

CUSTOMER_PAYLOAD = {
    "company_name": "Acme Corp",
    "contact_name": "Wile Coyote",
    "email": "wile@acme.com",
    "phone": "+1-555-0100",
    "status": "active",
}


async def _register_and_login(client, payload):
    await client.post("/api/v1/auth/register", json=payload)
    return await client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]}
    )


async def _manager_client(client, set_user_role):
    await _register_and_login(client, MANAGER_PAYLOAD)
    await set_user_role(MANAGER_PAYLOAD["email"], "manager")
    # Re-login so get_current_user re-reads the (now-promoted) role on each request —
    # role is fetched fresh from the DB per request, so this isn't strictly required,
    # but keeps the session cookies aligned with a realistic login flow.
    await client.post(
        "/api/v1/auth/login",
        json={"email": MANAGER_PAYLOAD["email"], "password": MANAGER_PAYLOAD["password"]},
    )
    return client


async def test_create_customer_requires_authentication(client):
    response = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    assert response.status_code == 401


async def test_plain_user_cannot_create_customer(client):
    await _register_and_login(client, USER_PAYLOAD)
    response = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    assert response.status_code == 403


async def test_manager_can_create_customer(client, set_user_role):
    await _manager_client(client, set_user_role)
    response = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    body = response.json()

    assert response.status_code == 201
    assert body["data"]["company_name"] == CUSTOMER_PAYLOAD["company_name"]
    assert body["data"]["status"] == "active"


async def test_get_customer_not_found(client, set_user_role):
    await _manager_client(client, set_user_role)
    response = await client.get("/api/v1/customers/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404


async def test_update_and_delete_unknown_customer_404(client, set_user_role):
    await _manager_client(client, set_user_role)
    unknown_id = "00000000-0000-0000-0000-000000000000"

    update_resp = await client.patch(f"/api/v1/customers/{unknown_id}", json={"status": "churned"})
    assert update_resp.status_code == 404

    delete_resp = await client.delete(f"/api/v1/customers/{unknown_id}")
    assert delete_resp.status_code == 404


async def test_list_customers_search_filter_sort_pagination(client, set_user_role):
    await _manager_client(client, set_user_role)
    await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    await client.post(
        "/api/v1/customers",
        json={**CUSTOMER_PAYLOAD, "company_name": "Globex Inc", "email": "hank@globex.com", "status": "prospect"},
    )

    search_resp = await client.get("/api/v1/customers", params={"search": "Acme"})
    assert search_resp.json()["data"]["total"] == 1

    filter_resp = await client.get("/api/v1/customers", params={"status": "prospect"})
    assert filter_resp.json()["data"]["total"] == 1
    assert filter_resp.json()["data"]["items"][0]["company_name"] == "Globex Inc"

    sorted_resp = await client.get(
        "/api/v1/customers", params={"sort_by": "company_name", "sort_order": "asc"}
    )
    names = [item["company_name"] for item in sorted_resp.json()["data"]["items"]]
    assert names == sorted(names)

    paged_resp = await client.get("/api/v1/customers", params={"page": 1, "page_size": 1})
    paged_body = paged_resp.json()["data"]
    assert len(paged_body["items"]) == 1
    assert paged_body["total"] == 2
    assert paged_body["total_pages"] == 2


async def test_user_can_view_but_not_modify_customer(client, set_user_role):
    await _manager_client(client, set_user_role)
    create_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = create_resp.json()["data"]["id"]

    await _register_and_login(client, USER_PAYLOAD)

    get_resp = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_resp.status_code == 200

    patch_resp = await client.patch(f"/api/v1/customers/{customer_id}", json={"status": "churned"})
    assert patch_resp.status_code == 403

    delete_resp = await client.delete(f"/api/v1/customers/{customer_id}")
    assert delete_resp.status_code == 403


async def test_manager_can_update_and_soft_delete_customer(client, set_user_role):
    await _manager_client(client, set_user_role)
    create_resp = await client.post("/api/v1/customers", json=CUSTOMER_PAYLOAD)
    customer_id = create_resp.json()["data"]["id"]

    patch_resp = await client.patch(f"/api/v1/customers/{customer_id}", json={"status": "churned"})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["data"]["status"] == "churned"

    delete_resp = await client.delete(f"/api/v1/customers/{customer_id}")
    assert delete_resp.status_code == 200

    get_resp = await client.get(f"/api/v1/customers/{customer_id}")
    assert get_resp.status_code == 404

    list_resp = await client.get("/api/v1/customers")
    assert list_resp.json()["data"]["total"] == 0
