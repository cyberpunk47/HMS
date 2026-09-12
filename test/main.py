import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed


BASE_URL = "http://localhost:9000"


def decode_profile_id(token):
    import base64

    payload = token.split(".")[1]

    payload += "=" * (-len(payload) % 4)

    data = base64.urlsafe_b64decode(payload)

    claims = json.loads(data.decode())

    return claims["profileId"]


def login(email, role):
    data = json.dumps({
        "email": email,
        "password": "Password@123"
    }).encode()

    req = urllib.request.Request(
        f"{BASE_URL}/users/login",
        data=data,
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:

            token = response.read().decode().strip()

            profile_id = decode_profile_id(token)

            return {
                "email": email,
                "role": role,
                "profileId": profile_id,
                "token": token
            }

    except Exception as e:
        print("FAILED:", email, e)
        return None


accounts = []

for i in range(1, 1001):
    accounts.append(
        (f"patient{i:03d}@hms.com", "PATIENT")
    )

for i in range(1, 1001):
    accounts.append(
        (f"doctor{i:03d}@hms.com", "DOCTOR")
    )


results = []

with ThreadPoolExecutor(max_workers=20) as executor:

    futures = [
        executor.submit(login, email, role)
        for email, role in accounts
    ]

    for future in as_completed(futures):

        result = future.result()

        if result:
            results.append(result)


print("Successful logins:", len(results))

patients = sum(
    1 for x in results
    if x["role"] == "PATIENT"
)

doctors = sum(
    1 for x in results
    if x["role"] == "DOCTOR"
)

print("Patients:", patients)
print("Doctors:", doctors)

with open("tokens.json", "w") as f:
    json.dump(results, f, indent=2)

print("Saved tokens.json")