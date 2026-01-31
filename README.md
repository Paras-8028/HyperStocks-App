📈 HyperStocks – Real-Time Stock Market Dashboard


🚀 Overview

HyperStocks is a modern, responsive stock market dashboard built using Next.js, React, and TypeScript, integrating TradingView widgets for real-time market data visualization.
It provides a clean UI, smooth performance, and reusable components suitable for fintech dashboards.

✨ Features

📊 Real-time interactive stock charts

🎯 Custom widget titles (independent of TradingView headers)

🌙 Dark-theme friendly UI

📱 Fully responsive layout

🧩 Reusable React components

⚡ Optimized TradingView script loading

🛡️ Prevents duplicate widget rendering

🛠️ Tech Stack
Category	Technologies
Frontend	Next.js (App Router), React
Language	TypeScript
Styling	Tailwind CSS
Charts	TradingView Embedded Widgets
Tools	GitHub, VS Code
📂 Project Structure
hyperstocks/
│
├── app/
│   └── (root)/
│       └── page.tsx
│
├── components/
│   └── TradingViewWidget.tsx
│
├── hooks/
│   └── useTradingViewWidget.tsx
│
├── lib/
│   └── utils.ts
│
├── public/
│
└── README.md

🧠 Core Implementation
🔹 TradingViewWidget Component

Displays TradingView charts

Accepts dynamic configuration

Supports custom titles

Fully responsive

🔹 useTradingViewWidget Hook

Injects TradingView scripts safely

Prevents duplicate widget loads

Cleans up scripts on unmount

Designed for Next.js client components

🧪 Challenges & Solutions
Challenge	Solution
TradingView title not rendering	Implemented custom titles outside widgets
Duplicate widget loading	Controlled script injection via custom hook
Layout clipping issues	Removed overflow restrictions
Next.js SSR conflicts	Used "use client" & DOM-safe hooks
📸 Screenshots

(Add dashboard screenshots here)

🔮 Future Enhancements

🔐 User authentication

⭐ Stock watchlist

🔎 Symbol search & selector

🌗 Light/Dark theme toggle

📈 Technical indicators & analytics

🌍 Multi-market support

⚙️ Installation & Setup
git clone https://github.com/your-username/hyperstocks.git
cd hyperstocks
npm install
npm run dev


Open 👉 http://localhost:3000

📌 Use Case

FinTech dashboards

Stock analysis platforms

Learning project for React + Next.js

College mini/major project

🤝 Contributing

Contributions are welcome!
Feel free to fork this repository and submit a pull request.

📄 License

This project is licensed under the MIT License.

👨‍💻 Author

Maharudra Patil

🔗 LinkedIn: https://linkedin.com/in/maharudra-patil

💻 GitHub: https://github.com/Paras-8028
