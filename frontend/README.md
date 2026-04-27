# AL Tracker — Frontend

React.js frontend for the Vehicle Tracking System.

## Stack
- **React 18** + React Router v6
- **Leaflet** / React-Leaflet for the live map
- **Axios** for API calls
- **jsPDF** + jspdf-autotable for PDF export
- **Lucide React** for icons
- **DM Sans + DM Mono** (Google Fonts)

## Directory Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── Layout.jsx / .css      ← App shell (sidebar + topbar + outlet)
│   │   ├── Sidebar.jsx / .css     ← Navigation, search, assign button
│   │   └── Topbar.jsx / .css      ← Clock, connection status, refresh
│   ├── map/
│   │   └── VehiclePopup.jsx / .css ← Map vehicle info card
│   └── common/
│       └── AssignUnitModal.jsx / .css ← Attach PCB ↔ VIN modal
├── context/
│   └── AppContext.jsx              ← Global state + API polling
├── pages/
│   ├── LiveMap.jsx / .css          ← Map page
│   └── Analytics.jsx / .css       ← Analytics + PDF export
├── services/
│   ├── api.js                      ← Axios wrappers for all endpoints
│   └── pdfExport.js                ← jsPDF report generator
├── App.jsx                         ← Router setup
├── index.js                        ← Entry point
└── index.css                       ← CSS variables + global styles
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure backend URL (edit .env)
REACT_APP_API_URL=http://localhost:8080/VT/api

# 3. Start development server
npm start
```

App runs at http://localhost:3000

## Features

| Feature | Details |
|---|---|
| Live Map | Leaflet map showing all vehicles with known GPS coordinates |
| Vehicle Marker | Custom SVG icon with dashed geofence circle |
| Vehicle Popup | Click marker → shows PCB, position, battery, navigate button |
| Analytics | Today's entries/exits, vehicles in yard list, inactive list |
| Toggle / Search | Checkbox toggle per vehicle, search by VIN or PCB |
| Assign Unit | Modal to attach a PCB to a new VIN (calls POST /vehicle/attach) |
| PDF Export | Downloads fleet report via jsPDF |
| Dark Mode | Full dark theme via CSS variables, persisted in localStorage |
| Auto Refresh | Polls backend every 15 seconds |
| Connected badge | Shows live connection state in topbar |

## Backend Requirements

Make sure your backend returns PCB location data. The frontend expects either:
- Flat fields on each PCB: `latitude`, `longitude`, `last_updated`
- Or a nested `PCBLocation` object: `{ latitude, longitude, last_updated }`

To include PCBLocation in your `getPCB` service, add an `include` to the Sequelize query:
```js
const pcbs = await PCB.findAll({
  where,
  order,
  include: [{ model: PCBLocation, as: 'PCBLocation' }]
});
```
