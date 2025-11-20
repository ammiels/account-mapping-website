# Company Account Mapping

A modern web application for analyzing and mapping company hiring activities by scraping public job boards. Track hiring trends, department growth, location expansion, and gain competitive intelligence across multiple platforms.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-success)
![Python](https://img.shields.io/badge/Python-3.13+-blue)
![Flask](https://img.shields.io/badge/Flask-3.x-green)

## Features

### 📊 Dashboard
- **Multi-Platform Job Analysis** - Paste any supported careers page URL to fetch and analyze open positions
- **Intelligent Platform Detection** - Automatically detects Greenhouse, Lever, Workable, Workday, and SmartRecruiters
- **Comprehensive Data Extraction** - Pulls job titles, departments, locations, seniority, employment type, and remote status
- **Interactive Visualizations** - View department distribution, seniority mix, and location breakdowns with Chart.js
- **Expandable Charts** - Click any chart to view it in full-screen for detailed analysis
- **Full Pagination Support** - Fetches all jobs across multiple pages for complete data sets

### 💾 Saved Analyses
- **Persistent Storage** - Save job analyses with custom names for future reference
- **Advanced Search & Filtering** - Search by company name, department, or filter by platform
- **Sort Options** - Sort by date saved (newest/oldest) or alphabetically
- **Quick Access** - View all saved analyses in a grid layout with key metrics at a glance
- **Detailed View** - Open any saved analysis to review complete insights and visualizations
- **Export Ready** - All data stored locally in browser storage for privacy

### ⚙️ Settings
- **General Preferences** - Customize default filters and display options
- **Export Configuration** - Set preferred export formats (CSV, Excel, JSON, PDF)
- **API Integrations** - Connect OpenAI and Slack for enhanced features
- **Data Management** - Control cache duration and clear stored data

## Tech Stack

- **Backend**: Flask 3.x (Python 3.13+)
- **Web Scraping**: BeautifulSoup4, Requests
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Charts**: Chart.js 4.4.6
- **Icons**: Font Awesome 6.5.1
- **Storage**: Browser LocalStorage (client-side)
- **Styling**: CSS Variables for theming (dark/light mode support)

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

- **Greenhouse** - `https://boards.greenhouse.io/<company>` (with full pagination)
- **Lever** - `https://jobs.lever.co/<company>` (HTML scraping)
- **Workable** - `https://apply.workable.com/<company>` (REST API)
- **Workday** - `https://<company>.myworkdayjobs.com/<site>` (POST API with pagination)
- **SmartRecruiters** - `https://careers.smartrecruiters.com/<company>` (REST API with pagination)

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
│   │   └── styles.css         # All application styles with CSS variables
│   └── js/
│       ├── main.js            # Dashboard functionality
│       ├── saved.js           # Saved analyses with search/filter
│       └── settings.js        # Settings page functionality
└── README.md
```

## Key Features Breakdown

### Dashboard Components
- **Job Search Input** - URL validation and intelligent platform detection
- **Account Pulse Cards** - Total roles, departments, locations, remote vs onsite mix
- **Interactive Charts** - Department distribution, seniority breakdown, top locations (top 10)
- **Jobs Table** - Comprehensive table with all job details (title, department, location, seniority, type, remote status, posted date, URL)
- **Save Analysis** - Store complete analyses with custom names for later review

### Data Analysis
- Aggregates jobs by department, seniority, location, and employment type
- Calculates remote work percentages and onsite roles
- Normalizes seniority levels (Entry, Mid, Senior, Lead, Executive)
- Normalizes employment types (Full-time, Part-time, Contract, Internship)
- Detects remote work from location strings and job titles
- Handles pagination to fetch complete job listings (tested with 3000+ jobs)

### Platform-Specific Implementations
- **Greenhouse**: Remix JSON API with page-based pagination
- **Lever**: HTML parsing of `.posting` elements
- **Workable**: REST API v1 widget endpoint
- **Workday**: POST API with offset/limit pagination
- **SmartRecruiters**: REST API v1 with comprehensive job data

### UI/UX Features
- **Dark Theme** - Default dark mode optimized for extended use
- **Light Theme** - Toggle available via theme switcher
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Fixed Sidebar Navigation** - Easy access to Dashboard, Saved Analyses, and Settings
- **Modal System** - Expandable charts, save dialogs, platform info
- **Modern Styling** - Teal accents, blue section headers, unified panel backgrounds
- **Keyboard Shortcuts** - ESC to close modals
- **Search & Filter** - Real-time search on saved analyses page with platform filtering

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
  "message": null,
  "jobs": [
    {
      "title": "Senior Software Engineer",
      "department": "Engineering",
      "location": "San Francisco, CA",
      "seniority": "Senior",
      "employment_type": "Full-time",
      "source": "Greenhouse",
      "posted_date": "2025-11-15",
      "url": "https://boards.greenhouse.io/company/jobs/123456",
      "is_remote": false
    }
  ],
  "summary": {
    "total_roles": 150,
    "department_count": 12,
    "location_count": 8,
    "remote_roles": 45,
    "onsite_roles": 105,
    "by_department": {"Engineering": 60, "Sales": 30},
    "by_seniority": {"Senior": 40, "Mid": 60},
    "top_locations": {"San Francisco, CA": 50, "New York, NY": 30}
  }
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

## Use Cases

### For Sales Teams
- Research target accounts before outreach
- Understand company structure and growth signals
- Identify decision-maker departments
- Track competitor hiring strategies

### For Recruiters
- Competitive intelligence on talent acquisition
- Identify companies actively hiring in specific areas
- Understand market salary ranges and role distributions
- Find similar companies for candidate sourcing

### For Market Research
- Track industry hiring trends over time
- Analyze remote work adoption by company
- Benchmark department sizes across competitors
- Identify emerging roles and skills

### For Job Seekers
- Understand company growth areas
- See full organizational structure
- Compare companies side-by-side
- Identify best-fit departments

## Performance

- Handles 3000+ job listings without performance degradation
- Pagination support ensures complete data retrieval
- Client-side storage for instant load times
- Efficient API usage with proper error handling

## Acknowledgments

- Chart.js for beautiful, interactive visualizations
- Font Awesome for comprehensive iconography
- Flask community for excellent documentation
- BeautifulSoup for reliable HTML parsing
