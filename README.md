# 📈 HyperStocks – Real-Time Stock Market Dashboard

![Next.js](https://img.shields.io/badge/Next.js-13+-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3+-38B2AC?logo=tailwindcss&logoColor=white)
![TradingView](https://img.shields.io/badge/TradingView-Widget-blue)
![Status](https://img.shields.io/badge/Status-Active-success)

---

## 🚀 Overview

**HyperStocks** is a modern, responsive stock market dashboard built using **Next.js**, **React**, and **TypeScript**, integrating **TradingView widgets** for real-time market data visualization.  
The project focuses on clean UI design, performance, and scalable component architecture.

---

## ✨ Features

- 📊 Real-time interactive stock charts  
- 🎯 Custom widget titles (independent of TradingView headers)  
- 🌙 Dark-theme friendly UI  
- 📱 Fully responsive layout  
- 🧩 Reusable React components  
- ⚡ Optimized TradingView script loading  
- 🛡️ Prevents duplicate widget rendering  

---

## 🛠️ Tech Stack

| Category | Technologies |
|--------|-------------|
| Frontend | Next.js (App Router), React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | TradingView Embedded Widgets |
| Tools | GitHub, VS Code |

---

## 📂 Project Structure

hyperstocks/
│
├── app/
│ └── (root)/
│ └── page.tsx
│
├── components/
│ └── TradingViewWidget.tsx
│
├── hooks/
│ └── useTradingViewWidget.tsx
│
├── lib/
│ └── utils.ts
│
├── public/
│
└── README.md

---

## 🧠 Core Implementation

### TradingViewWidget Component
- Displays TradingView charts  
- Accepts dynamic widget configuration  
- Supports custom titles  
- Responsive and reusable  

### useTradingViewWidget Hook
- Dynamically injects TradingView scripts  
- Prevents duplicate widget loading  
- Cleans up widgets on unmount  
- Optimized for Next.js client components  

---

## 🧪 Challenges & Solutions

| Challenge | Solution |
|--------|----------|
TradingView title not rendering | Implemented custom titles above widgets |
Duplicate widget rendering | Controlled script injection via custom hook |
Layout clipping | Removed overflow restrictions |
Next.js SSR conflicts | Used `"use client"` and DOM-safe hooks |

---

## 📸 Screenshots

![HyperStocks Dashboard]([https://your-image-url-here](https://ik.imagekit.io/ParasPatil/Pho3.jpg?updatedAt=1769104129172))

---

## 🔮 Future Enhancements

- 🔐 User authentication  
- ⭐ Stock watchlist  
- 🔎 Symbol search and selector  
- 🌗 Light/Dark theme toggle  
- 📈 Advanced technical indicators  
- 🌍 Multi-market support
 
---

📌 Use Cases

FinTech dashboards

Stock analysis platforms

React & Next.js learning project

College mini/major project

🤝 Contributing

Contributions are welcome.
Fork the repository and submit a pull request.

📄 License

This project is licensed under the MIT License.

👨‍💻 Author

Maharudra Patil

🔗 LinkedIn: https://linkedin.com/in/maharudra-patil
💻 GitHub: https://github.com/Paras-8028

