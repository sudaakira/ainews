from __future__ import annotations

import hashlib
import html
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import feedparser
import httpx
from openai import OpenAI

JST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parents[1]
STATE_PATH = ROOT / "data" / "seen.json"
USER_AGENT = "service-scout/1.0 (+scheduled research agent)"


@dataclass
class Candidate:
    title: str
    url: str
    source: str
    description: str = ""
    published_at: str = ""
    popularity: int = 0
    score: int = 0
    reason: str = ""
    summary: str = ""
    audience: str = ""
    japan_potential: str = ""


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clean_text(value: str, limit: int = 600) -> str:
    text = re.sub(r"<[^>]+>", " ", value or "")
    text = re.sub(r"\s+", " ", html.unescape(text)).strip()
    return text[:limit]


def parse_datetime(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.replace(tzinfo=dt.tzinfo or timezone.utc).astimezone(timezone.utc)
    except ValueError:
        try:
            return parsedate_to_datetime(str(value)).astimezone(timezone.utc)
        except (TypeError, ValueError, OverflowError):
            return None


def candidate_key(candidate: Candidate) -> str:
    parsed = urlparse(candidate.url)
    host = parsed.netloc.lower().removeprefix("www.")
    path = parsed.path.rstrip("/").lower()
    normalized_title = re.sub(r"[^a-z0-9]+", "", candidate.title.lower())
    raw = f"{host}{path}|{normalized_title}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


def fetch_hacker_news(client: httpx.Client, since: datetime) -> list[Candidate]:
    response = client.get(
        "https://hn.algolia.com/api/v1/search_by_date",
        params={
            "tags": "story",
            "numericFilters": f"created_at_i>{int(since.timestamp())},points>2",
            "hitsPerPage": 100,
        },
    )
    response.raise_for_status()
    result = []
    for item in response.json().get("hits", []):
        title = item.get("title") or ""
        url = item.get("url") or f"https://news.ycombinator.com/item?id={item.get('objectID')}"
        if title and url:
            result.append(
                Candidate(
                    title=title,
                    url=url,
                    source="Hacker News",
                    description=clean_text(item.get("story_text") or ""),
                    published_at=item.get("created_at") or "",
                    popularity=int(item.get("points") or 0) + int(item.get("num_comments") or 0) * 2,
                )
            )
    return result


def fetch_github(client: httpx.Client, since: datetime) -> list[Candidate]:
    token = os.getenv("GITHUB_TOKEN", "")
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = client.get(
        "https://api.github.com/search/repositories",
        params={
            "q": f"created:>={since.date().isoformat()} archived:false fork:false",
            "sort": "stars",
            "order": "desc",
            "per_page": 50,
        },
        headers=headers,
    )
    response.raise_for_status()
    result = []
    for item in response.json().get("items", []):
        result.append(
            Candidate(
                title=item.get("name") or item.get("full_name") or "",
                url=item.get("html_url") or "",
                source="GitHub",
                description=clean_text(item.get("description") or ""),
                published_at=item.get("created_at") or "",
                popularity=int(item.get("stargazers_count") or 0) + int(item.get("forks_count") or 0) * 2,
            )
        )
    return [x for x in result if x.title and x.url]


def fetch_rss(since: datetime) -> list[Candidate]:
    defaults = [
        "https://www.producthunt.com/feed",
        "https://techcrunch.com/category/startups/feed/",
    ]
    feeds = [x.strip() for x in os.getenv("RSS_FEEDS", ",".join(defaults)).split(",") if x.strip()]
    result: list[Candidate] = []
    for feed_url in feeds:
        parsed = feedparser.parse(feed_url, agent=USER_AGENT)
        source = clean_text(parsed.feed.get("title", "RSS"), 80)
        for entry in parsed.entries[:50]:
            published = entry.get("published") or entry.get("updated") or ""
            published_dt = parse_datetime(published)
            if published_dt and published_dt < since:
                continue
            title = clean_text(entry.get("title", ""), 160)
            url = entry.get("link", "")
            if title and url:
                result.append(
                    Candidate(
                        title=title,
                        url=url,
                        source=source,
                        description=clean_text(entry.get("summary") or entry.get("description") or ""),
                        published_at=published,
                        popularity=5,
                    )
                )
    return result


def deduplicate(candidates: list[Candidate]) -> list[Candidate]:
    best: dict[str, Candidate] = {}
    for candidate in candidates:
        key = candidate_key(candidate)
        if key not in best or candidate.popularity > best[key].popularity:
            best[key] = candidate
    return list(best.values())


def score_candidate(candidate: Candidate, current: datetime) -> int:
    published = parse_datetime(candidate.published_at)
    age_hours = max(0.0, (current - published).total_seconds() / 3600) if published else 24.0
    freshness = max(0, round(30 - min(age_hours, 72) / 72 * 30))
    popularity = min(30, round(8 * (candidate.popularity + 1) ** 0.35))
    product_signal = 0
    haystack = f"{candidate.title} {candidate.description}".lower()
    keywords = ["launch", "introducing", "open source", "ai", "agent", "developer", "saas", "tool", "app"]
    product_signal = min(25, sum(5 for word in keywords if word in haystack))
    source_quality = {"GitHub": 12, "Hacker News": 10}.get(candidate.source, 8)
    return min(100, freshness + popularity + product_signal + source_quality)


def load_seen() -> dict[str, str]:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_seen(seen: dict[str, str]) -> None:
    cutoff = now_utc() - timedelta(days=90)
    pruned = {k: v for k, v in seen.items() if (parse_datetime(v) or cutoff) >= cutoff}
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(pruned, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def enrich_with_llm(candidates: list[Candidate]) -> list[Candidate]:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or not candidates:
        for item in candidates:
            item.summary = item.description or item.title
            item.reason = f"{item.source}で公開され、反応値は{item.popularity}です。"
            item.audience = "新しいWebサービスを探している人"
            item.japan_potential = "国内利用の可能性を要確認"
        return candidates

    client = OpenAI(api_key=api_key, base_url=os.getenv("OPENAI_BASE_URL") or None)
    payload = [
        {
            "index": i,
            "title": x.title,
            "url": x.url,
            "source": x.source,
            "description": x.description,
            "popularity": x.popularity,
            "score": x.score,
        }
        for i, x in enumerate(candidates)
    ]
    prompt = f"""あなたは新規Webサービスのリサーチャーです。次の候補を日本語で簡潔に分析してください。
推測を事実のように書かず、入力にない料金や数値は作らないでください。
JSONオブジェクトのみを返し、形式は {{"items":[{{"index":0,"summary":"一言説明","reason":"注目理由","audience":"想定利用者","japan_potential":"日本での可能性"}}]}} としてください。
候補: {json.dumps(payload, ensure_ascii=False)}"""
    response = client.chat.completions.create(
        model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    try:
        parsed = json.loads(response.choices[0].message.content or "{}")
        by_index = {int(x["index"]): x for x in parsed.get("items", [])}
        for i, item in enumerate(candidates):
            values = by_index.get(i, {})
            item.summary = clean_text(values.get("summary") or item.description or item.title, 220)
            item.reason = clean_text(values.get("reason") or f"{item.source}で注目されています。", 240)
            item.audience = clean_text(values.get("audience") or "新サービスを探している人", 160)
            item.japan_potential = clean_text(values.get("japan_potential") or "要検証", 180)
    except (ValueError, TypeError, KeyError):
        return enrich_without_llm(candidates)
    return candidates


def enrich_without_llm(candidates: list[Candidate]) -> list[Candidate]:
    for item in candidates:
        item.summary = item.description or item.title
        item.reason = f"{item.source}で公開され、反応値は{item.popularity}です。"
        item.audience = "新しいWebサービスを探している人"
        item.japan_potential = "国内利用の可能性を要確認"
    return candidates


def render_html(candidates: list[Candidate], generated: datetime) -> str:
    date_label = generated.astimezone(JST).strftime("%Y-%m-%d %H:%M JST")
    if not candidates:
        body = "<p>今回、新たに基準を満たしたサービスはありませんでした。</p>"
    else:
        cards = []
        for rank, item in enumerate(candidates, 1):
            cards.append(f"""
            <section style="border:1px solid #ddd;border-radius:10px;padding:16px;margin:16px 0">
              <h2 style="margin:0 0 8px">{rank}. <a href="{html.escape(item.url)}">{html.escape(item.title)}</a></h2>
              <p><strong>一言：</strong>{html.escape(item.summary)}</p>
              <p><strong>注目理由：</strong>{html.escape(item.reason)}</p>
              <p><strong>想定ユーザー：</strong>{html.escape(item.audience)}</p>
              <p><strong>日本での可能性：</strong>{html.escape(item.japan_potential)}</p>
              <p><strong>発掘スコア：</strong>{item.score}/100　<strong>情報源：</strong>{html.escape(item.source)}</p>
            </section>""")
        body = "".join(cards)
    return f"""<!doctype html><html><body style="font-family:Arial,'Noto Sans JP',sans-serif;max-width:760px;margin:auto;color:#222">
    <h1>新サービス発掘レポート</h1><p>{date_label}</p>{body}
    <hr><p style="color:#666;font-size:12px">自動収集した公開情報です。導入・購入前に公式情報をご確認ください。</p>
    </body></html>"""


def send_graph_email(subject: str, html_body: str) -> None:
    required = ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET", "MAIL_SENDER", "MAIL_RECIPIENT"]
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"メール設定が不足しています: {', '.join(missing)}")

    with httpx.Client(timeout=30, headers={"User-Agent": USER_AGENT}) as client:
        token_response = client.post(
            f"https://login.microsoftonline.com/{os.environ['AZURE_TENANT_ID']}/oauth2/v2.0/token",
            data={
                "client_id": os.environ["AZURE_CLIENT_ID"],
                "client_secret": os.environ["AZURE_CLIENT_SECRET"],
                "scope": "https://graph.microsoft.com/.default",
                "grant_type": "client_credentials",
            },
        )
        token_response.raise_for_status()
        token = token_response.json()["access_token"]
        recipients = [x.strip() for x in os.environ["MAIL_RECIPIENT"].split(",") if x.strip()]
        response = client.post(
            f"https://graph.microsoft.com/v1.0/users/{os.environ['MAIL_SENDER']}/sendMail",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "message": {
                    "subject": subject,
                    "body": {"contentType": "HTML", "content": html_body},
                    "toRecipients": [{"emailAddress": {"address": x}} for x in recipients],
                },
                "saveToSentItems": True,
            },
        )
        response.raise_for_status()


def run() -> int:
    current = now_utc()
    lookback_hours = int(os.getenv("LOOKBACK_HOURS", "18"))
    since = current - timedelta(hours=lookback_hours)
    seen = load_seen()

    with httpx.Client(timeout=30, headers={"User-Agent": USER_AGENT}, follow_redirects=True) as client:
        candidates: list[Candidate] = []
        collectors = [("Hacker News", lambda: fetch_hacker_news(client, since)), ("GitHub", lambda: fetch_github(client, since)), ("RSS", lambda: fetch_rss(since))]
        for name, collector in collectors:
            try:
                candidates.extend(collector())
            except Exception as exc:  # Continue when one public source is temporarily unavailable.
                print(f"WARN: {name} collection failed: {exc}", file=sys.stderr)

    unique = deduplicate(candidates)
    fresh = [x for x in unique if candidate_key(x) not in seen]
    for item in fresh:
        item.score = score_candidate(item, current)
    minimum = int(os.getenv("MIN_SCORE", "35"))
    limit = int(os.getenv("RESULT_LIMIT", "3"))
    selected = sorted((x for x in fresh if x.score >= minimum), key=lambda x: x.score, reverse=True)[:limit]
    selected = enrich_with_llm(selected)

    html_body = render_html(selected, current)
    subject = f"【新サービス発掘】注目サービス{len(selected)}選｜{current.astimezone(JST):%Y-%m-%d %H:%M}"
    if os.getenv("DRY_RUN", "false").lower() == "true":
        print(subject)
        print(json.dumps([asdict(x) for x in selected], ensure_ascii=False, indent=2))
        return 0

    send_graph_email(subject, html_body)
    timestamp = current.isoformat()
    for item in selected:
        seen[candidate_key(item)] = timestamp
    save_seen(seen)
    print(f"Sent {len(selected)} candidates to {os.environ['MAIL_RECIPIENT']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
