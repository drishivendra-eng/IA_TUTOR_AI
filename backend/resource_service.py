import re
from html.parser import HTMLParser
from urllib.parse import urljoin

import requests

SOURCE_PAGE = 'https://learninghub.telecom.com.fj/worksheet'
SOURCE_HOST = 'learninghub.telecom.com.fj'


class _LinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self._href: str | None = None
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == 'a':
            self._href = dict(attrs).get('href')
            self._parts = []

    def handle_data(self, data: str) -> None:
        if self._href is not None:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == 'a' and self._href:
            self.links.append((' '.join(self._parts).strip(), self._href))
            self._href = None
            self._parts = []


def resolve_resource(filename: str) -> dict[str, str]:
    filename = filename.strip()
    if not filename or len(filename) > 300:
        raise ValueError('Invalid resource filename.')

    response = requests.get(
        SOURCE_PAGE,
        timeout=20,
        headers={'User-Agent': 'IA-Tutor-Resource-Resolver/1.0'},
    )
    response.raise_for_status()

    parser = _LinkParser()
    parser.feed(response.text)
    wanted = re.sub(r'\s+', ' ', filename).strip().casefold()

    candidates: list[tuple[int, str]] = []
    for label, href in parser.links:
        absolute = urljoin(SOURCE_PAGE, href)
        if not absolute.startswith('https://' + SOURCE_HOST + '/'):
            continue
        label_norm = re.sub(r'\s+', ' ', label).strip().casefold()
        path_norm = absolute.casefold()
        score = 0
        if wanted == label_norm:
            score = 100
        elif wanted in label_norm or wanted in path_norm:
            score = 80
        else:
            wanted_words = set(re.findall(r'[a-z0-9]+', wanted))
            candidate_words = set(re.findall(r'[a-z0-9]+', (label_norm + ' ' + path_norm)))
            overlap = len(wanted_words & candidate_words)
            if overlap:
                score = overlap
        if score:
            candidates.append((score, absolute))

    if not candidates:
        raise LookupError(f'Resource file was not found on the official public resource page: {filename}')

    candidates.sort(key=lambda item: item[0], reverse=True)
    return {'filename': filename, 'url': candidates[0][1], 'source': SOURCE_PAGE}
