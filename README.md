# 철새 도래지 지도

월 슬라이더로 한국의 철새 도래지를 지도에서 보고, 장소를 클릭하면 종 설명과 관찰 팁을 보여주는 정적 웹 페이지.

## 실행

```
python3 -m http.server 8000
```

프로젝트 루트에서 실행한 뒤 http://localhost:8000 을 연다.

## 폴더 구조

```
index.html                  페이지 진입점
css/style.css               스타일
js/config.js                설정(TOPICS 등)
js/main.js                  초기화와 모듈 연결
js/dataLoader.js            JSON 데이터 로드
js/mapView.js               Leaflet 지도와 마커
js/monthSlider.js           월 슬라이더
js/infoPanel.js             종 설명·관찰 팁 패널
scripts/updateMonthsFromGbif.mjs  GBIF 기록으로 월 정보 갱신
scripts/gbif-config.json    갱신 스크립트 설정
data/migratory-birds.json   철새 도래지 데이터
README.md                   이 문서
```

## 데이터 형식

```json
{
  "topic": { "id": "...", "title": "..." },
  "species": { "<speciesId>": { "name": "", "description": "", "tips": "", "color": "#rrggbb" } },
  "sites": [
    { "id": "", "name": "", "lat": 0, "lng": 0,
      "observations": [ { "species": "<speciesId>", "months": [1, 2, 12] } ] }
  ]
}
```

## 월 데이터 갱신 (GBIF)

Node 18 이상과 api.gbif.org 접속이 필요하다.

```
node scripts/updateMonthsFromGbif.mjs          # 드라이런(파일을 쓰지 않음)
node scripts/updateMonthsFromGbif.mjs --write  # 데이터 파일에 반영
```

기존 장소·종 조합의 `months`만 바꾼다. 설정은 `scripts/gbif-config.json`.

| 키 | 의미 |
|---|---|
| `dataFile` | 갱신할 데이터 파일(프로젝트 루트 기준) |
| `occurrenceSearchUrl` | GBIF 출현 기록 검색 API 주소 |
| `radiusKilometers` | 장소 중심 검색 반경(km) |
| `yearRange` | 집계할 연도 범위 [시작, 끝] |
| `minimumRecordsPerMonth` | 월로 인정할 최소 기록 수 |
| `requestIntervalMilliseconds` | 요청 사이 대기 시간 |
| `maxRetries`, `retryWaitMilliseconds` | HTTP 429 재시도 횟수와 대기 시간 |
| `userAgent` | 요청 User-Agent |
| `taxonKeys` | 종 ID별 GBIF taxonKey 목록 |

데이터 출처: [GBIF.org](https://www.gbif.org) 출현 기록(검색 API). 주요 데이터셋은 eBird Observation Dataset(CC BY 4.0)과 iNaturalist Research-grade Observations(CC BY-NC 4.0)이며, 비영리 용도로만 쓴다. 기록 수는 시민과학 기록이라 관찰자 활동량의 영향을 받는다.

## 새 주제 추가

1. `data/`에 위 형식의 JSON 파일을 추가한다.
2. `js/config.js`의 `TOPICS` 배열에 `{ id, dataFile }` 항목을 하나 추가한다.

샘플 데이터의 좌표와 월 정보는 대략값이며 검증되지 않았다.
