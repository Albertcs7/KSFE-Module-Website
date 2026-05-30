import pandas as pd
import mysql.connector
import os
import sys

# ---------------------------------------------------------
# 1. Database Connection
# ---------------------------------------------------------
def get_db_connection():
    try:
        return mysql.connector.connect(
            host="localhost",       
            user="root",   
            password="",
            database="ksfe"         
        )
    except mysql.connector.Error as err:
        print(f"\n[!] Fatal Error: Could not connect to the database. ({err})")
        sys.exit(1)

# ---------------------------------------------------------
# 2. The Processing Function
# ---------------------------------------------------------
def process_remittance_file(file_path, amount_column_name, db_connection):
    print(f"\n--- Processing: {file_path} ---")
    cursor = db_connection.cursor()
    
    try:
        # 1. Load the file
        df = pd.read_excel(file_path)

        if amount_column_name not in df.columns:
            print(f"[!] Error: The column '{amount_column_name}' was not found in this file.")
            print(f"    Found columns: {df.columns.tolist()}")
            return

        # 2. Handle Dates with Explicit Format (Crucial Fix)
        # We use format='%d-%m-%y' to handle the '26-03-01' style correctly.
        # errors='coerce' turns header text or junk into NaT (Not a Time).
        df['Date'] = pd.to_datetime(df['Date'], format='%d-%m-%y', errors='coerce')

        # 3. CRITICAL: Drop rows where Date, Emp. Code, or Policy No. are missing/invalid
        # This automatically removes the "Total" rows and any junk rows at the top.
        df = df.dropna(subset=['Date', 'Emp. Code', 'Policy No.'])
        
        # 4. Clean Strings
        df['Policy No.'] = df['Policy No.'].astype(str).str.replace(r'\.0$', '', regex=True)
        df['Emp. Code'] = df['Emp. Code'].astype(str).str.replace(r'\.0$', '', regex=True)

        # 5. Calculate Due Month BEFORE converting to None
        df['Due_Month'] = df['Date'] + pd.DateOffset(months=1)

        # 6. Format to MySQL standard YYYY-MM-DD
        df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
        df['Due_Month'] = df['Due_Month'].dt.strftime('%Y-%m-%d')

        # 7. Convert remaining empty cells to None for MySQL
        df = df.where(pd.notnull(df), None)

        # --- DB Logic remains the same ---
        insert_query = """
            INSERT INTO policy_remittance 
            (employee_policy_id, salary_month, due_month, amount_deducted, policy_cheque_id) 
            VALUES (%s, %s, %s, %s, %s)
        """

        lookup_query = """
            SELECT employee_policy_id 
            FROM employee_policy 
            WHERE employee_code = %s AND policy_no = %s
        """

        success_count = 0

        for index, row in df.iterrows():
            emp_code = row['Emp. Code']
            policy_no = row['Policy No.']
            
            cursor.execute(lookup_query, (emp_code, policy_no))
            result = cursor.fetchone() 
            
            if result is None:
                print(f"Row {index} Skipped: Code {emp_code} with Policy {policy_no} not found in DB.")
                continue 
            
            emp_policy_id = result[0]
            
            values = (
                emp_policy_id,               
                row['Date'],                 
                row['Due_Month'],            
                row[amount_column_name],  
                None                      
            )
            
            try:
                cursor.execute(insert_query, values)
                success_count += 1
            except mysql.connector.Error as err:
                print(f"Database Error on row {index} (Code: {emp_code}): {err}")

        db_connection.commit()
        print(f"\n[✓] Success! Inserted {success_count} rows from {file_path}.")

    except Exception as e:
        print(f"\n[!] An error occurred while processing the file: {e}")
    finally:
        cursor.close()
# ---------------------------------------------------------
# 3. Cheque  File COde
# ---------------------------------------------------------

def process_cheque_file(file_path, db_connection):
    print(f"\n--- Processing Unified Cheque File: {file_path} ---")
    cursor = db_connection.cursor()
    
    try:
        df = pd.read_excel(file_path)
        df.columns = df.columns.astype(str).str.strip()

        def find_column(target_name):
            return next((c for c in df.columns if c.lower() == target_name.lower()), None)

        def parse_excel_date(value):
            if pd.isna(value):
                return pd.NaT
            if isinstance(value, pd.Timestamp):
                return value.normalize()
            if hasattr(value, "to_pydatetime"):
                return pd.Timestamp(value).normalize()
            if isinstance(value, (int, float)):
                return pd.to_datetime(value, unit='d', origin='1899-12-30', errors='coerce')
            return pd.to_datetime(str(value).strip(), errors='coerce', dayfirst=True)

        encashment_col = find_column('Date of encashment')
        salary_month_col = find_column('Salary Month')
        sli_col = find_column('details of cheque sli')
        gis_col = find_column('details of cheque gis')

        if encashment_col is None or salary_month_col is None:
            print("[!] Error: Required columns 'Date of encashment' and 'Salary Month' were not found.")
            print(f"    Found columns: {df.columns.tolist()}")
            return

        # Parse dates from either real Excel dates, text dates, or Excel serial numbers.
        df['Encashment Date'] = pd.to_datetime(df[encashment_col].map(parse_excel_date), errors='coerce')
        df['Salary Month'] = pd.to_datetime(df[salary_month_col].map(parse_excel_date), errors='coerce')

        # Drop rows where dates couldn't be parsed
        df = df.dropna(subset=['Encashment Date', 'Salary Month'])
        print(f"DEBUG: Rows remaining after dropping empty dates: {len(df)}")

        insert_cheque_query = """
            INSERT INTO policy_cheque (encashment_date, receipt_no, salary_month, policy_type) 
            VALUES (%s, %s, %s, %s)
        """
        
        update_remittance_query = """
            UPDATE policy_remittance r
            JOIN employee_policy e ON r.employee_policy_id = e.employee_policy_id
            SET r.policy_cheque_id = %s 
            WHERE r.salary_month = %s 
              AND e.policy_type = %s 
              AND r.policy_cheque_id IS NULL
        """
        # Only de-duplicate on columns that actually exist in the file.
        dedupe_subset = ['Salary Month']
        for col_name in (sli_col, gis_col):
            if col_name is not None:
                dedupe_subset.append(col_name)
        if len(dedupe_subset) > 1:
            df = df.drop_duplicates(subset=dedupe_subset)

        for index, row in df.iterrows():
            # Check both GIS and SLI columns in the same row
            mapping = {
                'SLI': 'details of cheque sli',
                'GIS': 'details of cheque gis'
            }

            for p_type, col_name in mapping.items():
                # Case-insensitive column lookup
                actual_col = next((c for c in df.columns if c.lower() == col_name.lower()), None)
                
                if actual_col:
                    receipt_val = row[actual_col]
                    if pd.notnull(receipt_val) and str(receipt_val).strip() != "":
                        try:
                            # Use the newly created 'Encashment Date' column here
                            encashment_date = row['Encashment Date'].strftime('%Y-%m-%d')
                            salary_month = row['Salary Month'].strftime('%Y-%m-%d')

                            cursor.execute(insert_cheque_query, (
                                encashment_date,
                                str(receipt_val).strip(),
                                salary_month,
                                p_type
                            ))

                            new_id = cursor.lastrowid
                            cursor.execute(update_remittance_query, (new_id, salary_month, p_type))

                            print(f"[Row {index}] {p_type} Linked: {receipt_val}")
                        except mysql.connector.Error as err:
                            if err.errno == 1062:
                                print(f"[Row {index}] Skipped duplicate receipt number: {receipt_val}")
                                continue
                            raise

        db_connection.commit()
        print("\n[✓] Done!")
        
    except Exception as e:
        db_connection.rollback()
        print(f"\n[!] Error: {e}")
    finally:
        cursor.close()
# ---------------------------------------------------------
# 4. Interactive Command Line Menu
# ---------------------------------------------------------
def main():
    print("========================================")
    print("   KSFE Data Management Tool")
    print("========================================")
    
    db_connection = get_db_connection()

    while True:
        print("\n" + "="*40)
        print("MAIN MENU:")
        print("  1) Insert Remittance Data (Separate GIS/SLI files)")
        print("  2) Insert Cheque Data (Unified file)")
        print("  q) Quit")
        
        main_choice = input("\nSelect an option: ").strip().lower()
        
        if main_choice == 'q':
            break
        
        if main_choice not in ['1', '2']:
            print("[!] Invalid selection.")
            continue

        # Get Filename
        file_name = input("Enter the Excel filename: ").strip()
        if not file_name.endswith('.xlsx'):
            file_name += '.xlsx'
            
        if not os.path.exists(file_name):
            print(f"[!] File '{file_name}' not found.")
            continue

        # --- BRANCHING LOGIC ---
        if main_choice == '1':
            # Selection only needed for Remittance
            print("\nSelect Remittance Type:")
            print("  1) GIS")
            print("  2) SLI")
            type_choice = input("Enter 1 or 2: ").strip()
            
            if type_choice == '1':
                policy_type_str = "GIS"
                amt_col = 'GIS Deducted Amount'
            elif type_choice == '2':
                policy_type_str = "SLI"
                amt_col = 'SLI Deducted Amount'
            else:
                print("[!] Invalid selection. Returning to menu.")
                continue
                
            process_remittance_file(file_name, amt_col, db_connection)
        
        elif main_choice == '2':
            # Cheque logic - No sub-menu needed
            # We pass None or a default if the file contains mixed types, 
            # or you can adjust the process_cheque_file to handle it internally.
            process_cheque_file(file_name , db_connection)

    db_connection.close()
    print("\nDatabase connection closed. Goodbye!")
    
# This ensures the script runs the menu when executed directly
if __name__ == "__main__":
    main()