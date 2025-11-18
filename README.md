# Company Account Mapping

A modern web application for analyzing and mapping company hiring activities by scraping public job boards. Track hiring trends, department growth, location expansion, and generate AI-powered insights.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Flask](https://img.shields.io/badge/Flask-2.x-green)

## Features

### 📊 Dashboard
- **Job Search URL Analysis** - Paste any supported careers page URL to fetch and analyze open positions
- **Real-time Platform Detection** - Automatically detects Greenhouse, Lever, Workable, and Indeed
- **AI-Generated Summaries** - Get instant insights about hiring focus, departments, and skills
- **Interactive Visualizations** - View department distribution, seniority mix, and location breakdowns with Chart.js
- **Expandable Charts** - Click any chart to view it in full-screen for better analysis

### 💾 Saved Analyses
- **Persistent Storage** - Save job analyses with custom names for future reference
- **Quick Access** - View all saved analyses in a grid layout with key metrics
- **Detailed View** - Open any saved analysis to review complete insights and data
- **Export Ready** - All data stored locally in browser storage

### ⚙️ Settings
- **General Preferences** - Customize default filters and display options
- **Export Configuration** - Set preferred export formats (CSV, Excel, JSON, PDF)
- **API Integrations** - Connect OpenAI and Slack for enhanced features
- **Data Management** - Control cache duration and clear stored data

## Tech Stack

- **Backend**: Flask 2.x (Python)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Charts**: Chart.js 4.4.6
- **Icons**: Font Awesome 6.5.1
- **Storage**: Browser LocalStorage

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/ammiels/account-mapping-website.git
cd account-mapping-website
```

2. **Install dependencies**
```bash
pip install flask requests beautifulsoup4
```

3. **Run the application**
```bash
python app.py
```

4. **Open your browser**
```
http://localhost:5000
```

## Usage

### Analyzing a Company

1. Navigate to the Dashboard
2. Enter a job board URL (e.g., `https://boards.greenhouse.io/company`)
3. Click "Fetch Jobs"
4. Review the AI-generated summary and visualizations
5. Click "Save Analysis" to store for later

### Supported Platforms

- **Greenhouse** - `https://boards.greenhouse.io/<company>`
- **Lever** - `https://jobs.lever.co/<company>`
- **Workable** - `https://apply.workable.com/<company>`
- **Indeed** - Public search URLs

### Viewing Saved Analyses

1. Click "Saved Analyses" in the sidebar
2. Browse your saved company analyses
3. Click any card to view full details
4. Delete analyses you no longer need

## Project Structure

```
account-mapping-website/
├── app.py                      # Flask backend & API routes
├── templates/
│   ├── base.html              # Base template
│   ├── dashboard.html         # Main dashboard page
│   ├── saved.html             # Saved analyses page
│   └── settings.html          # Settings page
├── static/
│   ├── css/
│   │   └── styles.css         # All application styles
│   └── js/
│       ├── main.js            # Dashboard functionality
│       └── saved.js           # Saved analyses functionality
└── README.md
```

## Key Features Breakdown

### Dashboard Components
- **Job Search Input** - URL validation and platform detection
- **Hiring Summary** - AI-generated analysis of hiring patterns
- **Account Pulse Cards** - Total roles, departments, locations, remote mix
- **Charts** - Department roles, seniority distribution, top locations
- **Jobs Table** - Searchable, filterable table of all positions

### Data Analysis
- Aggregates jobs by department, seniority, and location
- Calculates remote work percentages
- Extracts common skills from job titles
- Identifies hiring trends and focus areas

### UI/UX Features
- Dark theme optimized for extended use
- Responsive design for all screen sizes
- Fixed sidebar navigation
- Modal popups for chart expansion and data entry
- Subtle borders and modern styling
- Keyboard shortcuts (ESC to close modals)

## API Endpoints

### `POST /api/fetch-jobs`
Fetches and analyzes jobs from a provided URL.

**Request:**
```json
{
  "search_url": "https://boards.greenhouse.io/company"
}
```

**Response:**
```json
{
  "supported": true,
  "platform": "Greenhouse",
  "message": "Successfully fetched X jobs",
  "jobs": [...],
  "summary": {...}
}
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Author

**Ammiel Joseph**
- GitHub: [@ammiels](https://github.com/ammiels)

## Acknowledgments

- Chart.js for beautiful visualizations
- Font Awesome for comprehensive iconography
- Flask community for excellent documentation
