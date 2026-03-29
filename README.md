# 🚀 ZeroBite – Hostel Food Wastage Reduction System

A smart web-based system to reduce food wastage in hostels by tracking real-time meal attendance using QR code scanning.

---

## 📌 Features

- 🔐 Role-based login (Student / Mess Manager)
- 📷 QR-based attendance system
- 🍽️ Meal tracking (Breakfast, Lunch, Dinner)
- ⏱️ Time-based validation (valid only during meal hours)
- 📊 Attendance records stored in database
- 📉 Food wastage monitoring
- 🎯 Clean and modern UI

---

## 🧠 How It Works

1. Mess Manager generates a QR code for a selected meal  
2. Students scan the QR using their dashboard  
3. System validates:
   - QR format  
   - Current meal timing  
4. Attendance is recorded instantly in database  

---

## ⏰ Meal Timings

| Meal       | Time                |
|------------|---------------------|
| Breakfast  | 7:30 AM – 9:30 AM   |
| Lunch      | 12:30 PM – 2:30 PM  |
| Dinner     | 7:30 PM – 9:30 PM   |

> ✅ QR codes remain valid until meal time ends (no manual expiry)

---

## 🛠️ Tech Stack

- Frontend: React / Next.js  
- Backend: Node.js / Express  
- Database: PostgreSQL (Neon DB)  
- Deployment: Vercel  

---

## 📂 Project Structure

```

/frontend
/backend
/database
/components
/pages

````

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ZeroBite.git
cd ZeroBite
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file:

```
DATABASE_URL=your_database_url
JWT_SECRET=your_secret_key
```

### 4. Run the Project

```bash
npm run dev
```

---

## 🔍 Key Functionalities

### ✅ QR Attendance

* QR contains only meal information
* No expiry timestamp
* Valid during meal time only

### ✅ Validation Logic

* Checks current time against meal timing
* Prevents duplicate attendance
* Ensures valid QR format

### ✅ Error Handling

* Invalid QR → proper message
* Meal time over → access denied
* Duplicate scan → prevented

---

## 🎯 Future Improvements

* 📱 Mobile app integration
* 📊 Advanced analytics dashboard
* 🔔 Notifications system
* 🤖 AI-based wastage prediction

---

## 👩‍💻 Author

**Drashti Sojitra**
Engineering Student @ Adani University

---

## ⭐ Contribution

Feel free to fork this repo and contribute!

---

## 📜 License

This project is for academic purposes.

