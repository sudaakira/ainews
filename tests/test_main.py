from datetime import datetime, timezone

from src.main import Candidate, candidate_key, deduplicate, render_html, score_candidate


def test_candidate_key_is_stable():
    a = Candidate("Example AI", "https://www.example.com/product/", "RSS")
    b = Candidate("Example AI", "https://example.com/product", "RSS")
    assert candidate_key(a) == candidate_key(b)


def test_deduplicate_keeps_more_popular():
    a = Candidate("Example", "https://example.com", "RSS", popularity=2)
    b = Candidate("Example", "https://example.com/", "HN", popularity=20)
    result = deduplicate([a, b])
    assert len(result) == 1
    assert result[0].popularity == 20


def test_score_is_bounded():
    candidate = Candidate(
        "Introducing an open source AI agent tool",
        "https://example.com",
        "GitHub",
        description="A developer app",
        published_at="2026-08-11T00:00:00Z",
        popularity=500,
    )
    value = score_candidate(candidate, datetime(2026, 8, 11, 1, tzinfo=timezone.utc))
    assert 0 <= value <= 100


def test_empty_report():
    output = render_html([], datetime(2026, 8, 11, tzinfo=timezone.utc))
    assert "基準を満たしたサービスはありません" in output
