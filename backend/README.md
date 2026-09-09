# 🚀 YouTube Bot with React Dashboard - Quick Start

## What's Included

✅ **Backend API Server** (Express.js)
- Bot control (start/stop)
- Config management
- Proxy testing
- Real-time logs
- Statistics tracking

✅ **React Dashboard** (Vite)
- Beautiful UI with 5 tabs
- Real-time status updates
- Proxy management
- Video queue editor
- Live logs viewer
- Responsive design

✅ **Full Integration**
- API communication
- WebSocket-ready logs
- Settings persistence
- Auto-refresh

---

## 🎯 Quick Start (3 Steps)

### Step 1: Start Backend API Server

**Option A - Using Batch File (Easiest):**
```powershell
# Double-click this file:
.\start-backend.bat
```

**Option B - Manual:**
```powershell
cd c:\Users\Gibbor\OneDrive\Documents\Desktop\hg\youtube-bot
npm install
npm run dev
```

Expected output:
```
==================================================
🚀 YouTube Bot API Server is running
📡 http://localhost:5000
🎨 Frontend: http://localhost:3000
==================================================
```

### Step 2: Start Frontend Dashboard

**Open new terminal/PowerShell and run:**

**Option A - Using Batch File:**
```powershell
# Double-click this file:
.\start-frontend.bat
```

**Option B - Manual:**
```powershell
cd c:\Users\Gibbor\OneDrive\Documents\Desktop\hg\youtube-bot\frontend
npm install
npm run dev
```

Expected output:
```
VITE v4.3.9  ready in 1234 ms

➜  Local:   http://localhost:3000/
➜  press h for help
```

### Step 3: Open Dashboard

Open your browser to:
```
http://localhost:3000
```

---

## 💻 Dashboard Walkthrough

### 1️⃣ Dashboard Tab
- View overall statistics
- Bot current status
- Configuration summary

### 2️⃣ Bot Control Tab
- **▶️ Start Bot** - Begin automation
- **⏹️ Stop Bot** - Stop automation
- Real-time stats (videos, subscriptions, success rate)

### 3️⃣ Proxies Tab
- Add new proxies (IP:PORT or IP:PORT:USER:PASS)
- Test each proxy individually
- Remove non-working proxies
- See proxy status (✅ WORKING / ❌ DOWN)

### 4️⃣ Settings Tab
- Add YouTube video URLs
- Choose headless mode on/off
- Build your video queue
- Save to config file

### 5️⃣ Logs Tab
- Real-time bot activity
- Color-coded messages
- Auto-scrolls to latest
- Shows last 100 entries

---

## 📝 How to Use the Bot

### Scenario 1: Watch Videos with Proxies

1. **Settings Tab:**
   - Add video URL: `https://www.youtube.com/watch?v=...`
   - Click ➕ Add
   - Repeat for more videos

2. **Proxies Tab:**
   - Add proxy: `IP:PORT` or `IP:PORT:USER:PASS`
   - Click 🧪 Test to verify it works
   - Repeat for multiple proxies
   - Click 💾 Save

3. **Bot Control Tab:**
   - Click ▶️ Start Bot
   - Watch Logs tab for activity
   - Check Dashboard for progress

4. **Monitor Progress:**
   - Switch to Logs tab to see real-time updates
   - Check Dashboard for statistics
   - Use Bot Control to see current stats

---

## 🔧 Troubleshooting

### Backend won't start (Port 5000 in use)

```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Try again
npm run dev
```

### Frontend won't start (Port 3000 in use)

```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Try again
cd frontend && npm run dev
```

### Proxies keep failing

1. Get fresh free proxies from:
   - https://free-proxy-list.net
   - https://www.sslproxies.org

2. Test manually:
   ```powershell
   curl -x "http://IP:PORT" https://httpbin.org/ip
   ```

3. Add working ones to Proxies tab

### Dependencies won't install

```powershell
# Clear npm cache
npm cache clean --force

# Try again
npm install

# For frontend specifically
cd frontend && npm install
```

---

## 📊 File Structure

```
youtube-bot/
├── 🔧 Backend Files
│   ├── server.js                    # Express API
│   ├── src/
│   │   ├── index.js                # Bot logic
│   │   ├── actions/                # Watch/Subscribe
│   │   ├── browser/                # Puppeteer
│   │   └── utils/                  # Helpers
│   └── config/settings.json        # Config saved

├── 🎨 Frontend Files  
│   ├── frontend/
│   │   ├── index.html              # Entry HTML
│   │   ├── vite.config.js          # Vite config
│   │   ├── src/
│   │   │   ├── App.jsx             # Main app
│   │   │   ├── App.css             # Styles
│   │   │   ├── components/         # 5 Tab components
│   │   │   └── api/botApi.js       # API calls
│   │   └── package.json            # Dependencies
│   └── start-frontend.bat          # Quick start

├── 📚 Documentation
│   ├── SETUP_GUIDE.md              # Full guide
│   ├── PROXY_SETUP.md              # Proxy help
│   ├── FREE_PROXY_GUIDE.md         # Free proxies
│   └── README.md                   # This file

└── ⚙️ Config
    ├── package.json                # Root deps
    ├── start-backend.bat           # Quick start
    └── .gitignore                  # Git ignore
```

---

## 🌐 API Endpoints (for developers)

```
POST   /api/bot/start               # Start bot
POST   /api/bot/stop                # Stop bot
GET    /api/bot/status              # Get status

GET    /api/config                  # Get config
POST   /api/config                  # Save config

POST   /api/proxy/test              # Test proxy
GET    /api/proxy/status            # Get proxies

GET    /api/logs                    # Get logs
POST   /api/logs/clear              # Clear logs

POST   /api/stats/update            # Update stats
GET    /api/health                  # Health check
```

---

## 💡 Tips & Best Practices

### Video Setup
- Add 2-5 videos to start
- Use variety of videos
- Test with free proxies first

### Proxy Management  
- Always test proxies before running
- Use paid proxies for production (higher success)
- Rotate proxies regularly
- Monitor for bans

### Bot Configuration
- Enable headless mode for speed
- Disable for visual debugging
- Monitor logs for issues
- Check dashboard stats regularly

### Performance
- Run backend and frontend in separate terminals
- Use Chrome browser (Puppeteer requirement)
- Have at least 2GB RAM free
- Good internet connection recommended

---

## 🎓 Learning Resources

### React Components Used
- `useState` - State management
- `useEffect` - Side effects
- Component composition
- Event handling

### Express.js Concepts
- Routing
- Middleware (CORS)
- JSON responses
- State management

### Puppeteer Features
- Browser automation
- Page navigation
- DOM interaction
- Proxy support

---

## ⚠️ Important Notes

**Disclaimer:**
- This tool is for educational purposes
- Respect YouTube's Terms of Service
- Use responsibly and ethically
- Check local laws regarding automation
- Bot activity may trigger YouTube security

**Security:**
- Don't share proxy credentials
- Keep configurations private
- Use environment variables for secrets
- Test in safe environments first

---

## 📞 Support

Having issues? Check:
1. **SETUP_GUIDE.md** - Detailed setup instructions
2. **PROXY_SETUP.md** - Proxy configuration guide
3. **FREE_PROXY_GUIDE.md** - Free proxy help
4. **Logs Tab** - Real-time error messages
5. Backend console output for errors

---

## 🎉 You're All Set!

```
✅ Backend: http://localhost:5000
✅ Frontend: http://localhost:3000
✅ Bot: Ready to run
✅ Dashboard: Ready to control
```

### Next Steps:

1. Open dashboard in browser
2. Add videos in Settings
3. Add proxies in Proxies
4. Click Start Bot
5. Watch the magic! 🚀

---

**Happy automating! 🤖💚**

*Built with React, Express, Puppeteer & ❤️*
