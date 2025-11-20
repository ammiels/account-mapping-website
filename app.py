import json
import logging
import re
from collections import Counter
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request


app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/119.0.0.0 Safari/537.36"
)

PLATFORM_PATTERNS: List[Tuple[str, str]] = [
    ("greenhouse.io", "Greenhouse"),
    ("lever.co", "Lever"),
    ("workable.com", "Workable"),
    ("indeed.com", "Indeed"),
]


def detect_platform(search_url: str) -> str:
    """Return the normalized platform name for a URL, or 'Unsupported'."""
    domain = urlparse(search_url).netloc.lower()
    for needle, platform in PLATFORM_PATTERNS:
        if needle in domain:
            return platform
    return "Unsupported"


def robots_allows(url: str) -> bool:
    """Check robots.txt rules for the url; default to allowed if not reachable."""
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = RobotFileParser()
    parser.set_url(robots_url)
    try:
        parser.read()
    except Exception as exc:  # pragma: no cover - network failure fallback
        logging.debug("robots.txt unavailable for %s: %s", robots_url, exc)
        return True
    path = parsed.path or "/"
    return parser.can_fetch(USER_AGENT, path)


@dataclass
class JobRecord:
    title: str
    department: Optional[str]
    location: Optional[str]
    seniority: Optional[str]
    employment_type: Optional[str]
    source: str
    posted_date: Optional[str]
    url: str
    is_remote: bool


def fetch_greenhouse_jobs(search_url: str) -> List[JobRecord]:
    """Fetch publicly listed Greenhouse openings from the provided URL."""
    if not robots_allows(search_url):
        logging.info("Robots.txt disallows fetching %s", search_url)
        return []

    try:
        response = requests.get(
            search_url,
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logging.warning("Unable to fetch Greenhouse URL %s: %s", search_url, exc)
        return []

    html = response.text

    # Try modern Remix-based boards first (with pagination)
    remix_jobs = parse_greenhouse_remix_jobs_all_pages(html, search_url)
    if remix_jobs:
        return remix_jobs

    # Fallback to legacy DOM parsing
    soup = BeautifulSoup(html, "html.parser")
    return parse_greenhouse_dom_jobs(soup, search_url)


def parse_greenhouse_remix_jobs_all_pages(html: str, base_url: str) -> List[JobRecord]:
    """Parse all job posts from Remix-powered Greenhouse boards, handling pagination."""
    # First, try to find the API endpoint from the page
    match = re.search(r"window\.__remixContext\s*=\s*(\{.*?\})\s*;", html, re.DOTALL)
    if not match:
        return []

    try:
        context = json.loads(match.group(1))
    except json.JSONDecodeError as exc:
        logging.debug("Unable to decode Greenhouse remix payload: %s", exc)
        return []
    
    # Try to get pagination info
    loader_data = context.get("state", {}).get("loaderData", {})
    board_payload: Optional[Dict[str, object]] = None
    if isinstance(loader_data, dict):
        board_payload = loader_data.get("routes/$url_token")
        if not board_payload:
            for payload in loader_data.values():
                if isinstance(payload, dict) and "jobPosts" in payload:
                    board_payload = payload
                    break

    if not isinstance(board_payload, dict):
        return []

    job_posts = board_payload.get("jobPosts", {})
    
    # Get pagination info (different Greenhouse boards use different field names)
    total_count = job_posts.get("total") or job_posts.get("totalCount", 0)
    total_pages = job_posts.get("total_pages", 1)
    current_page = job_posts.get("page", 1)
    data = job_posts.get("data") if isinstance(job_posts, dict) else None
    
    if not isinstance(data, list):
        return []
    
    all_jobs = []
    
    # Parse initial page jobs
    all_jobs.extend(parse_greenhouse_job_entries(data, base_url))
    
    # If there are more pages, fetch them
    if total_pages > 1:
        parsed = urlparse(base_url)
        # Remove existing page parameter if present
        base_url_no_page = base_url.split('?')[0]
        
        for page_num in range(2, total_pages + 1):
            try:
                page_url = f"{base_url_no_page}?page={page_num}"
                response = requests.get(
                    page_url,
                    headers={"User-Agent": USER_AGENT},
                    timeout=10,
                )
                if response.status_code != 200:
                    logging.debug(f"Failed to fetch page {page_num}, status: {response.status_code}")
                    break
                
                # Parse the JSON from the next page
                page_match = re.search(r"window\.__remixContext\s*=\s*(\{.*?\})\s*;", response.text, re.DOTALL)
                if not page_match:
                    break
                
                page_context = json.loads(page_match.group(1))
                page_loader = page_context.get("state", {}).get("loaderData", {})
                page_board = page_loader.get("routes/$url_token")
                if not page_board:
                    for payload in page_loader.values():
                        if isinstance(payload, dict) and "jobPosts" in payload:
                            page_board = payload
                            break
                
                if not page_board:
                    break
                
                page_jobs = page_board.get("jobPosts", {})
                page_data = page_jobs.get("data", [])
                
                if not page_data:
                    break
                
                all_jobs.extend(parse_greenhouse_job_entries(page_data, base_url))
                
                # Safety check to avoid infinite loops
                if page_num > 20:  # Max 20 pages = 1000 jobs
                    break
                    
            except (requests.RequestException, json.JSONDecodeError) as exc:
                logging.debug(f"Unable to fetch page {page_num}: {exc}")
                break
    
    return all_jobs


def parse_greenhouse_job_entries(data: List[Dict], base_url: str) -> List[JobRecord]:
    """Parse a list of Greenhouse job entries into JobRecord objects."""
    jobs: List[JobRecord] = []
    
    for entry in data:
        if not isinstance(entry, dict):
            continue

        title = (entry.get("title") or "").strip()
        job_url = entry.get("absolute_url") or entry.get("url")
        if not title or not job_url:
            continue

        job_url = urljoin(base_url, job_url)
        location = (entry.get("location") or "").strip() or None

        department = None
        dept_info = entry.get("department")
        if isinstance(dept_info, dict):
            department = (dept_info.get("name") or "").strip() or None
        department = department or "General"

        content_html = entry.get("content") or ""
        content_text = ""
        if content_html:
            content_text = BeautifulSoup(content_html, "html.parser").get_text(" ", strip=True)

        text_blob = " ".join(
            filter(None, [title, content_text, location or ""])
        ).lower()

        seniority = normalize_seniority(title)
        employment_type = normalize_employment_type(text_blob)
        remote_context = f"{title} {content_text}".lower()
        is_remote = detect_remote_role((location or "").lower(), remote_context)

        jobs.append(
            JobRecord(
                title=title,
                department=department,
                location=location,
                seniority=seniority,
                employment_type=employment_type,
                source="Greenhouse",
                posted_date=entry.get("published_at"),
                url=job_url,
                is_remote=is_remote,
            )
        )
    
    return jobs


def parse_greenhouse_dom_jobs(soup: BeautifulSoup, base_url: str) -> List[JobRecord]:
    """Fallback parser for legacy Greenhouse board markup."""
    openings = soup.select("#departments .opening") or soup.select(".opening")

    jobs: List[JobRecord] = []
    for opening in openings:
        anchor = opening.find("a", href=True)
        if not anchor:
            continue

        title = anchor.get_text(strip=True)
        if not title:
            continue
        job_url = urljoin(base_url, anchor["href"])

        location_el = opening.find(class_="location")
        location = location_el.get_text(strip=True) if location_el else None

        department = None
        for sibling in opening.parents:
            header = sibling.find_previous(["h2", "h3"])
            if header and header.get_text(strip=True):
                department = header.get_text(strip=True)
                break
        department = department or "General"

        details_text = opening.get_text(" ", strip=True).lower()
        location_text = (location or "").lower()

        seniority = normalize_seniority(title)
        employment_type = normalize_employment_type(details_text)
        is_remote = detect_remote_role(location_text, title.lower())

        jobs.append(
            JobRecord(
                title=title,
                department=department,
                location=location,
                seniority=seniority,
                employment_type=employment_type,
                source="Greenhouse",
                posted_date=None,
                url=job_url,
                is_remote=is_remote,
            )
        )

    return jobs


def normalize_seniority(title: str) -> Optional[str]:
    """Map common seniority keywords into a consistent label."""
    title_lc = title.lower()
    mapping = [
        ("intern", "Intern"),
        ("graduate", "Graduate"),
        ("junior", "Junior"),
        ("associate", "Associate"),
        ("mid", "Mid"),
        ("senior", "Senior"),
        ("lead", "Lead"),
        ("principal", "Principal"),
        ("director", "Director"),
        ("vp", "VP"),
        ("vice president", "VP"),
        ("head of", "Head"),
    ]
    for keyword, label in mapping:
        if keyword in title_lc:
            return label
    return None


def normalize_employment_type(details_text: str) -> Optional[str]:
    """Infer employment type from descriptive text when possible."""
    if "full time" in details_text or "full-time" in details_text:
        return "full_time"
    if "part time" in details_text or "part-time" in details_text:
        return "part_time"
    if "contract" in details_text or "temporary" in details_text:
        return "contract"
    if re.search(r"\bintern(ship)?\b", details_text):
        return "internship"
    return None


def detect_remote_role(location_text: str, title_text: str) -> bool:
    """Return true if the location/title suggests a remote-friendly role."""
    remote_keywords = [
        "remote",
        "anywhere",
        "distributed",
        "work from home",
        "flexible",
        "hybrid",
    ]
    return any(keyword in location_text or keyword in title_text for keyword in remote_keywords)


def summarize_jobs(jobs: List[JobRecord]) -> Dict[str, object]:
    """Aggregate summary metrics for the dashboard."""
    total = len(jobs)
    departments = Counter(job.department or "Unassigned" for job in jobs)
    seniority = Counter(job.seniority or "Unspecified" for job in jobs)
    locations = Counter(job.location or "Unspecified" for job in jobs)

    remote_count = sum(1 for job in jobs if job.is_remote)
    onsite_count = total - remote_count

    top_locations = dict(locations.most_common(6))

    return {
        "total_roles": total,
        "department_count": len([d for d in departments if d != "Unassigned"]),
        "location_count": len([l for l in locations if l != "Unspecified"]),
        "remote_roles": remote_count,
        "onsite_roles": onsite_count,
        "by_department": dict(departments),
        "by_seniority": dict(seniority),
        "top_locations": top_locations,
    }


def serialize_jobs(jobs: List[JobRecord]) -> List[Dict[str, object]]:
    return [asdict(job) for job in jobs]


def fetch_workable_jobs(search_url: str) -> List[JobRecord]:
    """Fetch publicly listed Workable openings from the provided URL."""
    # Extract company subdomain from URL (e.g., "riverlane" from "https://apply.workable.com/riverlane/")
    parsed = urlparse(search_url)
    path_parts = [p for p in parsed.path.split('/') if p]
    
    if not path_parts:
        logging.warning("Unable to extract company name from Workable URL: %s", search_url)
        return []
    
    company_name = path_parts[0]
    
    # Workable uses a public API endpoint for job listings
    api_url = f"https://apply.workable.com/api/v1/widget/accounts/{company_name}"
    
    try:
        response = requests.get(
            api_url,
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        logging.warning("Unable to fetch Workable API %s: %s", api_url, exc)
        return []
    except json.JSONDecodeError as exc:
        logging.warning("Unable to parse Workable API response: %s", exc)
        return []
    
    job_data = data.get("jobs", [])
    if not isinstance(job_data, list):
        return []
    
    jobs: List[JobRecord] = []
    
    for job in job_data:
        if not isinstance(job, dict):
            continue
        
        title = (job.get("title") or "").strip()
        job_url = job.get("url") or job.get("shortlink")
        
        if not title or not job_url:
            continue
        
        # Extract location from locations array or fallback to city
        locations_list = job.get("locations", [])
        if locations_list and isinstance(locations_list, list):
            loc = locations_list[0]
            city = loc.get("city", "")
            country = loc.get("country", "")
            location = f"{city}, {country}" if city and country else (city or country or None)
        else:
            city = job.get("city", "")
            country = job.get("country", "")
            location = f"{city}, {country}" if city and country else (city or country or None)
        
        department = (job.get("department") or "").strip() or "General"
        
        # Parse employment type
        employment_type_raw = (job.get("employment_type") or "").lower()
        if "full" in employment_type_raw:
            employment_type = "full_time"
        elif "part" in employment_type_raw:
            employment_type = "part_time"
        elif "contract" in employment_type_raw:
            employment_type = "contract"
        else:
            employment_type = None
        
        # Get seniority from experience field or infer from title
        experience = job.get("experience", "")
        if experience:
            seniority = normalize_seniority(experience) or normalize_seniority(title)
        else:
            seniority = normalize_seniority(title)
        
        # Check if telecommuting/remote
        is_remote = job.get("telecommuting", False)
        if not is_remote:
            location_text = (location or "").lower()
            is_remote = detect_remote_role(location_text, title.lower())
        
        posted_date = job.get("published_on")
        
        jobs.append(
            JobRecord(
                title=title,
                department=department,
                location=location,
                seniority=seniority,
                employment_type=employment_type,
                source="Workable",
                posted_date=posted_date,
                url=job_url,
                is_remote=is_remote,
            )
        )
    
    return jobs


def fetch_lever_jobs(search_url: str) -> List[JobRecord]:
    """Fetch publicly listed Lever openings from the provided URL."""
    if not robots_allows(search_url):
        logging.info("Robots.txt disallows fetching %s", search_url)
        return []

    try:
        response = requests.get(
            search_url,
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        logging.warning("Unable to fetch Lever URL %s: %s", search_url, exc)
        return []

    soup = BeautifulSoup(response.text, "html.parser")
    jobs: List[JobRecord] = []

    # Lever uses <div class="posting"> for each job listing
    postings = soup.find_all(class_="posting")
    
    for posting in postings:
        # Find the job title and URL
        title_elem = posting.find("h5", {"data-qa": "posting-name"})
        if not title_elem:
            continue
            
        title = title_elem.get_text(strip=True)
        if not title:
            continue
        
        # Get the link
        link_elem = posting.find("a", class_="posting-title")
        job_url = link_elem.get("href", "") if link_elem else ""
        if not job_url:
            continue
        
        # Extract location
        location_elem = posting.find(class_="location")
        location = location_elem.get_text(strip=True) if location_elem else None
        
        # Extract commitment/employment type
        commitment_elem = posting.find(class_="commitment")
        commitment_text = commitment_elem.get_text(strip=True).lower() if commitment_elem else ""
        
        # Try to find department from parent grouping or default to General
        department = "General"
        parent_group = posting.find_parent(class_="postings-group")
        if parent_group:
            dept_header = parent_group.find_previous_sibling("h3")
            if dept_header:
                department = dept_header.get_text(strip=True)
        
        # Normalize the data
        seniority = normalize_seniority(title)
        
        # Parse employment type from commitment
        if "full" in commitment_text or "permanent" in commitment_text:
            employment_type = "full_time"
        elif "part" in commitment_text:
            employment_type = "part_time"
        elif "contract" in commitment_text or "fixed" in commitment_text or "temporary" in commitment_text:
            employment_type = "contract"
        elif "intern" in commitment_text:
            employment_type = "internship"
        else:
            employment_type = normalize_employment_type(title.lower())
        
        # Check workplace type for remote
        workplace_elem = posting.find(class_="workplaceTypes")
        workplace_text = workplace_elem.get_text(strip=True).lower() if workplace_elem else ""
        
        location_text = (location or "").lower()
        is_remote = (
            "remote" in workplace_text or 
            "hybrid" in workplace_text or
            detect_remote_role(location_text, title.lower())
        )
        
        jobs.append(
            JobRecord(
                title=title,
                department=department,
                location=location,
                seniority=seniority,
                employment_type=employment_type,
                source="Lever",
                posted_date=None,
                url=job_url,
                is_remote=is_remote,
            )
        )
    
    return jobs


def fetch_jobs(search_url: str, platform: str) -> Tuple[List[JobRecord], Optional[str]]:
    """Fetch job records for a given platform, returning jobs and an info message."""
    if platform == "Greenhouse":
        jobs = fetch_greenhouse_jobs(search_url)
        message = None if jobs else "No roles found on the provided Greenhouse page."
        return jobs, message
    
    if platform == "Workable":
        jobs = fetch_workable_jobs(search_url)
        message = None if jobs else "No roles found on the provided Workable page."
        return jobs, message
    
    if platform == "Lever":
        jobs = fetch_lever_jobs(search_url)
        message = None if jobs else "No roles found on the provided Lever page."
        return jobs, message

    placeholder = f"Support for {platform} is coming soon."
    return [], placeholder


@app.route("/")
@app.route("/dashboard")
def dashboard() -> str:
    return render_template("dashboard.html", title="Company Account Mapping")


@app.route("/settings")
def settings() -> str:
    return render_template("settings.html", title="Settings - Company Account Mapping")


@app.route("/saved")
def saved() -> str:
    return render_template("saved.html", title="Saved Analyses - Company Account Mapping")


@app.post("/api/fetch-jobs")
def api_fetch_jobs():
    payload = request.get_json(silent=True) or {}
    search_url = (payload.get("search_url") or "").strip()

    if not search_url:
        return (
            jsonify(
                {
                    "supported": False,
                    "platform": "Unknown",
                    "message": "Please provide a job search URL to continue.",
                    "jobs": [],
                    "summary": {},
                }
            ),
            400,
        )

    platform = detect_platform(search_url)

    if platform == "Unsupported":
        return jsonify(
            {
                "supported": False,
                "platform": "Unknown",
                "message": "This URL is not from a supported platform.",
                "jobs": [],
                "summary": {},
            }
        )

    jobs, info_message = fetch_jobs(search_url, platform)
    summary = summarize_jobs(jobs) if jobs else {
        "total_roles": 0,
        "department_count": 0,
        "location_count": 0,
        "remote_roles": 0,
        "onsite_roles": 0,
        "by_department": {},
        "by_seniority": {},
        "top_locations": {},
    }

    response = {
        "supported": True,
        "platform": platform,
        "message": info_message,
        "jobs": serialize_jobs(jobs),
        "summary": summary,
    }
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True)
