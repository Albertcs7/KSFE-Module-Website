import pandas as pd
import mysql.connector
from decimal import Decimal

# =========================
# DATABASE CONFIG
# =========================
db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="",
    database="ksfe"
)

cursor = db.cursor()

# =========================
# ASK POLICY TYPE
# =========================
policy_type = input("Enter policy type (GIS/SLI): ").strip().upper()

if policy_type not in ["GIS", "SLI"]:
    print("Invalid policy type")
    exit()

# =========================
# SELECT FILE
# =========================
if policy_type == "GIS":
    file_name = "GIS_Data.xlsx"
else:
    file_name = "SLI_data.xlsx"

print(f"Reading file: {file_name}")

# =========================
# READ EXCEL FILE
# =========================
df = pd.read_excel(file_name)

# =========================
# INSERT QUERY
# =========================
query = """
INSERT INTO employee_policy
(
    employee_code,
    employee_name,
    policy_no,
    policy_type,
    premium
)
VALUES (%s, %s, %s, %s, %s)
"""

# =========================
# LOOP THROUGH ROWS
# =========================
for index, row in df.iterrows():

    # Skip rows with empty employee code
    if pd.isna(row["EMPLOYEE CODE"]):
        print(f"Skipping row {index + 1}: Empty employee code")
        continue

    employee_code = int(row["EMPLOYEE CODE"])
    employee_name = str(row["EMPLOYEE NAME"]).strip()

    # Handle policy number
    if pd.isna(row["POLICY NUMBER"]):
        policy_no = None
    else:
        policy_no_raw = str(row["POLICY NUMBER"]).strip()

        if policy_no_raw in ["0", "0.0", "nan"]:
            policy_no = None
        else:
            policy_no = policy_no_raw

    # Handle premium
    if pd.isna(row["PREMIUM"]):
        premium = Decimal("0.00")
    else:
        premium = Decimal(str(row["PREMIUM"]))

    values = (
        employee_code,
        employee_name,
        policy_no,
        policy_type,
        premium
    )

    try:
        cursor.execute(query, values)

    except mysql.connector.Error as err:
        print(f"Error at row {index + 1}: {err}")

# =========================
# COMMIT CHANGES
# =========================
db.commit()

print(f"{cursor.rowcount} rows inserted successfully")

# =========================
# CLOSE CONNECTION
# =========================
cursor.close()
db.close()