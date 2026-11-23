# 계절 생물 지도

철새·벚꽃·단풍 명소를 체크박스로 켜고 끄며 월 슬라이더로 지도에서 보고, 장소를 클릭하면 설명과 관찰 팁을 보여주는 정적 웹 페이지. 월을 바꾸면 철새 이동 애니메이션이 나오고, 재생 버튼으로 월을 자동으로 넘길 수 있다.

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
js/migrationAnimation.js    철새 이동 애니메이션
js/playControl.js           월 자동 재생 버튼
js/infoPanel.js             종 설명·관찰 팁 패널
js/topicFilter.js           소재 켜고 끄기 체크박스
js/seasonStatus.js          계절 시기 계산(평년값·관측값 기준)
scripts/updateMonthsFromGbif.mjs  GBIF 기록으로 월 정보 갱신
scripts/gbif-config.json    갱신 스크립트 설정
scripts/updateSeasonObservations.mjs  기상청 계절관측값 갱신
scripts/kma-config.json     기상청 갱신 스크립트 설정
data/migratory-birds.json   철새 도래지 데이터
data/cherry-blossom.json    벚꽃 명소 데이터
data/autumn-foliage.json    단풍 명소 데이터
data/season-observations.json  기상청 계절관측값(스크립트가 생성)
README.md                   이 문서
```

## 데이터 형식

```json
{
  "topic": { "id": "...", "title": "..." },
  "species": { "<speciesId>": { "name": "", "description": "", "tips": "", "color": "#rrggbb", "breedingArea": { "name": "", "lat": 0, "lng": 0 } } },
  "sites": [
    { "id": "", "name": "", "lat": 0, "lng": 0,
      "observations": [ { "species": "<speciesId>", "months": [1, 2, 12] } ] }
  ]
}
```

`breedingArea`는 선택 필드로, 이동 애니메이션에 쓰며 이동하는 종에만 필요하다.

장소(site)의 선택 필드 `seasonalNormal`은 기상청 평년값이다: `{ "stationName": "", "stationNumber": 0, "isProxy": false, "item": "", "events": [ { "name": "", "date": "MM-DD" } ] }` (`isProxy`가 true이면 가까운 관측소 값을 빌려 쓴 것).

`data/season-observations.json`은 기상청 관측값 파일이다: `{ "source", "year", "updatedAt", "sites": { "<topicId>/<siteId>": [ { "name": "", "date": "MM-DD" } ] } }`.

## 월 데이터 갱신 (GBIF)

Node 18 이상과 api.gbif.org 접속이 필요하다.

```
node scripts/updateMonthsFromGbif.mjs          # 드라이런(파일을 쓰지 않음)
node scripts/updateMonthsFromGbif.mjs --write  # 데이터 파일에 반영
```

`data/migratory-birds.json`에만 적용된다. 기존 장소·종 조합의 `months`만 바꾼다. 설정은 `scripts/gbif-config.json`.

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

## 기상청 관측값 갱신

벚꽃·단풍 관측일을 기상청 API허브에서 받아 `data/season-observations.json`에 쓴다. 환경 변수 `KMA_AUTH_KEY`(API허브 인증키, 계절관측 자료 활용신청 필요)가 있어야 하며, 키는 절대 커밋하지 않는다.

```
node scripts/updateSeasonObservations.mjs                 # 드라이런(기본은 올해, 파일을 쓰지 않음)
node scripts/updateSeasonObservations.mjs --year 2026     # 계절 연도 지정
node scripts/updateSeasonObservations.mjs --write         # data/season-observations.json에 기록
node scripts/updateSeasonObservations.mjs --inspect 108   # 관측소 번호의 API 원본 응답 출력(코드 확인용, 키는 가려짐)
```

설정은 `scripts/kma-config.json`. 첫 `--write` 전에 `--inspect <관측소번호> --year <YYYY>`로 응답을 확인하고 `eventCodes`와 `responseFormat`을 모두 채워야 한다(비어 있으면 스크립트가 요청 전에 멈춘다).

- `responseFormat`: `fieldSeparator`(`,` `;` `|` `tab` `whitespace` 중 하나)와 관측소·관측일·계절 코드 열의 0부터 시작하는 번호(`stationIndex`, `observedAtIndex`, `ssnIdIndex`, `ssnMdIndex`).
- 응답이 오류이거나 자료 행이 없거나 날짜·연도·관측소가 맞지 않으면 중단하며, 기존 관측값을 빈 결과로 덮어쓰지 않는다.

## 새 소재 추가

1. `data/`에 위 형식의 JSON 파일을 추가한다.
2. `js/config.js`의 `TOPICS` 배열에 `{ id, dataFile }` 항목을 하나 추가한다.

추가한 소재는 체크박스로 자동으로 나타난다.

## 기상청 평년값 출처

기상청 계절관측 평년값(1991–2020): https://data.kma.go.kr/data/seasonObs/seasonObsDataList.do?pgmNo=648 (공공데이터포털 15097125, 이용허락범위 제한 없음). 벚꽃·단풍 장소의 `seasonalNormal`에 쓰였다.

- `isProxy: true`는 장소에서 가장 가까운 관측소 값을 빌린 것이다. 유명산 단풍의 관측소-산 연결(예: 속초-설악산)은 추정이다.
- 벚꽃·단풍의 월 정보는 평년값에서 계산했다(첫 이벤트 날짜부터 마지막 이벤트 날짜+7일까지가 걸치는 달). 불국사 겹벚꽃은 관측 항목이 없어 기존 값을 쓴다.

샘플 데이터(철새·벚꽃·단풍)의 좌표와 월 정보, `breedingArea` 좌표는 대략값이며 검증되지 않았다.
