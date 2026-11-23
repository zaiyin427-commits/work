# 계절 생물 지도

철새·벚꽃·단풍 명소를 왼쪽 위의 토글 버튼으로 켜고 끄며, 오른쪽 위의 날짜 달력으로 날짜를 골라 지도에서 보고, 장소를 클릭하면 설명과 관찰 팁을 보여주는 정적 웹 페이지. 기본 날짜는 오늘이고, 선택한 날짜의 달이 바뀌면 철새 이동 애니메이션이 나온다. 달력의 ◀/▶는 같은 날짜의 이전·다음 달로 이동하고(말일을 넘으면 말일로 맞춤), "오늘" 버튼은 오늘로 돌아오며, 재생 버튼은 한 달씩 자동으로 넘긴다(12월 다음은 같은 해 1월). 장소 패널의 "N월 M일 기준" 시기 판정도 선택한 날짜를 쓴다. 화면 너비 640px 이하이거나 높이 700px 이하이면 달력이 날짜 버튼 하나로 접혀 있다가 눌러서 펼친다. 장소 패널이 열릴 때, 접힌 모드에서 날짜를 고른 뒤, Esc를 누를 때, 지도를 탭할 때 자동으로 다시 접힌다.

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
js/speciesIcons.js          종별 지도 아이콘
js/dateCalendar.js          날짜 달력(선택 날짜, 이전/다음 달, 오늘)
js/dateUtils.js             날짜 계산 도우미
js/migrationAnimation.js    철새 이동 애니메이션
js/playControl.js           날짜 자동 재생 버튼(달력 안)
js/infoPanel.js             종 설명·관찰 팁 패널
js/topicFilter.js           소재 켜고 끄기 토글 버튼
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
  "species": { "<speciesId>": { "name": "", "description": "", "tips": "", "color": "#rrggbb", "icon": "crane", "breedingArea": { "name": "", "lat": 0, "lng": 0 } } },
  "sites": [
    { "id": "", "name": "", "lat": 0, "lng": 0,
      "observations": [ { "species": "<speciesId>", "months": [1, 2, 12] } ] }
  ]
}
```

`icon`은 선택 필드로, 지도 마커 아이콘의 ID이다(`crane`, `goose`, `swan`, `duck`, `cherry-blossom`, `double-cherry-blossom`, `maple-leaf`, `ginkgo-leaf` 중 하나이며 `js/speciesIcons.js`에 정의). 없거나 알 수 없는 값이면 동그라미 마커를 쓴다.

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

- 응답이 `responseFormat.headerColumns` 열 이름을 담은 `#` 헤더 줄만 있고 자료 행이 없으면 그 관측소는 해당 연도 "관측 없음"으로 경고만 출력하고 계속 진행한다(헤더도 없는 빈 응답이나 오류 응답은 그대로 중단).
- `eventCodes`는 관측소 108(2026년)의 실제 응답과 기상자료개방포털의 항목 순서(DB006xxx)를 보고 채운 추정값이며, 기상청 공식 코드표에서 가져온 것이 아니다.
- `responseFormat`: `fieldSeparator`(`,` `;` `|` `tab` `whitespace` 중 하나)와 관측소·관측일·계절 코드 열의 0부터 시작하는 번호(`stationIndex`, `observedAtIndex`, `ssnIdIndex`, `ssnMdIndex`).
- 응답이 오류이거나 자료 행이 없거나 날짜·연도·관측소가 맞지 않으면 중단하며, 기존 파일에 이벤트가 하나라도 있으면(연도와 무관) 0건 결과로 덮어쓰지 않는다. 리다이렉트(3xx) 응답은 인증키 유출을 막기 위해 따라가지 않고 실패로 처리한다.
- `allowInsecureApiUrlForTesting`은 로컬 루프백(127.0.0.1) 테스트 전용이며, 커밋되는 설정에서는 반드시 `false`로 둔다.

## 새 소재 추가

1. `data/`에 위 형식의 JSON 파일을 추가한다.
2. `js/config.js`의 `TOPICS` 배열에 `{ id, label, dataFile }` 항목을 하나 추가한다(`label`은 토글 버튼에 쓰는 짧은 이름이며, 없으면 JSON의 `topic.title`을 쓴다).

추가한 소재는 토글 버튼으로 자동으로 나타난다.

## 기상청 평년값 출처

기상청 계절관측 평년값(1991–2020): https://data.kma.go.kr/data/seasonObs/seasonObsDataList.do?pgmNo=648 (공공데이터포털 15097125, 이용허락범위 제한 없음). 벚꽃·단풍 장소의 `seasonalNormal`에 쓰였다.

- `isProxy: true`는 장소에서 가장 가까운 관측소 값을 빌린 것이다. 유명산 단풍의 관측소-산 연결(예: 속초-설악산)은 추정이다.
- 벚꽃·단풍의 월 정보는 평년값에서 계산했다(첫 이벤트 날짜부터 마지막 이벤트 날짜+7일까지가 걸치는 달). 불국사 겹벚꽃은 관측 항목이 없어 기존 값을 쓴다.

샘플 데이터(철새·벚꽃·단풍)의 좌표와 월 정보, `breedingArea` 좌표는 대략값이며 검증되지 않았다.
