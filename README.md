# 계절 생물 지도

개나리·진달래·벚꽃·단풍 모든 소재의 명소 중 선택한 날짜의 달에 볼 수 있는 곳을 지도에 표시하고, 오른쪽 위의 날짜 달력으로 날짜를 골라 지도에서 보며, 장소를 클릭하면 설명과 관찰 팁을 보여주는 정적 웹 페이지. 기본 날짜는 오늘이고, 달력의 ◀/▶는 같은 날짜의 이전·다음 달로 이동하고(말일을 넘으면 말일로 맞춤), "오늘" 버튼은 오늘로 돌아오며, 재생 버튼은 한 달씩 자동으로 넘긴다(12월 다음은 같은 해 1월). 장소 패널의 "N월 M일 기준" 시기 판정도 선택한 날짜를 쓴다. 달력 맨 위의 날짜 버튼(▴/▾)을 눌러 접었다 펼 수 있고 Esc로도 접는다. 넓은 화면에서는 기본으로 펼쳐져 있으며 장소 패널이 열려도 그대로 두고, 화면 너비 640px 이하이거나 높이 700px 이하이면 기본으로 접혀 있다가 눌러서 펼친다. 이 좁은 화면에서는 달력을 펼치면 장소 패널이 닫히고, 장소 패널이 열릴 때·날짜를 고른 뒤·지도를 탭할 때 자동으로 다시 접힌다. 화면 크기가 두 모드를 넘나들면 그 모드의 기본 상태로 돌아간다.

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
js/festivalLayer.js         축제 마커·점 레이어와 팝업
js/festivalStatus.js        축제 날짜 상태(예정·진행 중·종료) 계산과 문구
js/festivalList.js          왼쪽 "축제" 목록 패널
js/nearbyFestivals.js       명소 패널의 "근처 축제" 목록
js/geoUtils.js              두 지점 사이 거리 계산
js/dateCalendar.js          날짜 달력(선택 날짜, 이전/다음 달, 오늘)
js/collapsiblePanel.js      접고 펼 수 있는 패널 공통 동작(달력·축제 목록)
js/dateUtils.js             날짜 계산 도우미
js/playControl.js           날짜 자동 재생 버튼(달력 안)
js/infoPanel.js             종 설명·관찰 팁 패널
js/seasonStatus.js          계절 시기 계산(평년값·관측값 기준)
scripts/updateSeasonObservations.mjs  기상청 계절관측값 갱신
scripts/kma-config.json     기상청 갱신 스크립트 설정
scripts/buildFestivals.mjs  TourAPI 축제 데이터 수집
scripts/tourapi-config.json 축제 수집 스크립트 설정
data/forsythia.json         개나리 명소 데이터
data/azalea.json            진달래 명소 데이터
data/cherry-blossom.json    벚꽃 명소 데이터
data/autumn-foliage.json    단풍 명소 데이터
data/season-observations.json  기상청 계절관측값(스크립트가 생성)
data/festivals.json         벚꽃·단풍 등 축제 데이터(스크립트가 생성, 지도에 표시)
README.md                   이 문서
```

## 데이터 형식

```json
{
  "topic": { "id": "...", "title": "..." },
  "species": { "<speciesId>": { "name": "", "description": "", "tips": "", "color": "#rrggbb", "icon": "forsythia" } },
  "sites": [
    { "id": "", "name": "", "lat": 0, "lng": 0,
      "observations": [ { "species": "<speciesId>", "months": [1, 2, 12] } ] }
  ]
}
```

`icon`은 선택 필드로, 지도 마커 아이콘의 ID이다(`forsythia`, `azalea`, `cherry-blossom`, `double-cherry-blossom`, `maple-leaf`, `ginkgo-leaf` 중 하나이며 `js/speciesIcons.js`에 정의). 없거나 알 수 없는 값이면 콘솔에 경고를 남기고 종의 `color`로 칠한 동그라미 마커를 쓴다(`color`도 없을 때만 회색).

장소(site)의 선택 필드 `seasonalNormal`은 기상청 평년값이다: `{ "stationName": "", "stationNumber": 0, "isProxy": false, "item": "", "events": [ { "name": "", "date": "MM-DD" } ] }` (`isProxy`가 true이면 해당 지점의 평년값을 구하지 못해 다른 관측소 값을 빌려 쓴 것).

`data/season-observations.json`은 기상청 관측값 파일이다: `{ "source", "year", "updatedAt", "sites": { "<topicId>/<siteId>": [ { "name": "", "date": "MM-DD" } ] } }`.

## 기상청 관측값 갱신

개나리·진달래·벚꽃·단풍 관측일을 기상청 API허브에서 받아 `data/season-observations.json`에 쓴다. 환경 변수 `KMA_AUTH_KEY`(API허브 인증키, 계절관측 자료 활용신청 필요)가 있어야 하며, 키는 절대 커밋하지 않는다.

```
node scripts/updateSeasonObservations.mjs                 # 드라이런(기본은 올해, 파일을 쓰지 않음)
node scripts/updateSeasonObservations.mjs --year 2026     # 계절 연도 지정
node scripts/updateSeasonObservations.mjs --write         # data/season-observations.json에 기록
node scripts/updateSeasonObservations.mjs --inspect 108   # 관측소 번호의 API 원본 응답 출력(코드 확인용, 키는 가려짐)
```

설정은 `scripts/kma-config.json`. 첫 `--write` 전에 `--inspect <관측소번호> --year <YYYY>`로 응답을 확인하고 `eventCodes`와 `responseFormat`을 모두 채워야 한다(비어 있으면 스크립트가 요청 전에 멈춘다).

- 응답이 `responseFormat.headerColumns` 열 이름을 담은 `#` 헤더 줄만 있고 자료 행이 없으면 그 관측소는 해당 연도 "관측 없음"으로 경고만 출력하고 계속 진행한다(헤더도 없는 빈 응답이나 오류 응답은 그대로 중단).
- `eventCodes`는 기상청 API허브 공식 코드표([SSN_ID.pdf](https://apihub.kma.go.kr/getAttachFile.do?fileName=SSN_ID.pdf), [SSN_MD.pdf](https://apihub.kma.go.kr/getAttachFile.do?fileName=SSN_MD.pdf))로 확인했다: 벚나무 205/202·203, 개나리 203/202, 진달래 204/202, 은행나무 301/301·302(SSN_ID/SSN_MD). 유명산 단풍 501/501·503의 SSN_MD 의미는 코드표 문장만으로는 모호해 확정하지 못했다.
- `responseFormat`: `fieldSeparator`(`,` `;` `|` `tab` `whitespace` 중 하나)와 관측소·관측일·계절 코드 열의 0부터 시작하는 번호(`stationIndex`, `observedAtIndex`, `ssnIdIndex`, `ssnMdIndex`).
- 응답이 오류이거나 자료 행이 없거나 날짜·연도·관측소가 맞지 않으면 중단하며, 기존 파일에 이벤트가 하나라도 있으면(연도와 무관) 0건 결과로 덮어쓰지 않는다. 리다이렉트(3xx) 응답은 인증키 유출을 막기 위해 따라가지 않고 실패로 처리한다.
- `allowInsecureApiUrlForTesting`은 로컬 루프백(127.0.0.1) 테스트 전용이며, 커밋되는 설정에서는 반드시 `false`로 둔다.

## 축제 데이터 갱신 (TourAPI)

벚꽃·단풍·개나리·진달래 관련 축제를 한국관광공사 TourAPI에서 받아 `data/festivals.json`에 쓴다. 환경 변수 `TOUR_API_KEY`에 공공데이터포털의 한국관광공사 국문 관광정보 서비스(KorService2) **일반 인증키(Decoding)**가 있어야 하며, 키는 어떤 파일에도 쓰거나 커밋하지 않는다.

```
TOUR_API_KEY=... node scripts/buildFestivals.mjs           # 드라이런(요약만 출력, 파일을 쓰지 않음)
TOUR_API_KEY=... node scripts/buildFestivals.mjs --write   # data/festivals.json에 기록
```

설정은 `scripts/tourapi-config.json`. `searchFestival2`를 호출해 올해 1월 1일에서 `eventStartLookbackYears`년 전 1월 1일부터 시작하는 행사를 모든 페이지에 걸쳐 받고, 제목에 `topicKeywords`의 키워드가 들어 있는 축제만 남긴다. 연중 행사(`yearRoundMinimumDays`일 이상)와 `koreaBounds` 밖의 좌표는 제외하고, 불완전한 페이지가 하나라도 있으면 오류로 중단한다. 브라우저는 API를 호출하지 않고 저장된 정적 JSON만 읽으며, 이미지는 저장하지 않는다.

`data/festivals.json` 형식:

```json
{
  "source": { "name": "", "url": "" },
  "updatedAt": "YYYY-MM-DD",
  "eventStartDate": "YYYY-MM-DD",
  "festivals": [
    { "id": "", "title": "", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD",
      "address": "", "lat": 0, "lng": 0, "topicIds": ["cherry-blossom"] }
  ]
}
```

| 설정 키 | 설명 |
|---|---|
| `apiUrl` | `searchFestival2` 엔드포인트 |
| `allowInsecureApiUrlForTesting` | 로컬 테스트 전용, 커밋되는 설정에서는 `false` |
| `authKeyEnvironmentVariable` | 인증키를 읽을 환경 변수 이름(`TOUR_API_KEY`) |
| `mobileOS`, `mobileApp`, `userAgent` | API 요청에 붙이는 식별 값 |
| `eventStartLookbackYears` | 올해 1월 1일에서 몇 년 전부터의 행사를 받을지 |
| `rowsPerPage`, `maxPages` | 페이지당 건수와 최대 페이지 수 |
| `requestIntervalMilliseconds`, `requestTimeoutMilliseconds` | 요청 간격과 제한 시간 |
| `maxRetries`, `retryWaitMilliseconds` | 일시적 오류의 재시도 횟수와 대기 시간 |
| `outputFile` | 결과를 쓸 파일 |
| `yearRoundMinimumDays` | 이 일수 이상 이어지는 행사는 연중 행사로 보고 제외 |
| `koreaBounds` | 이 위경도 범위 밖의 좌표는 제외 |
| `topicKeywords` | 소재 ID별 제목 키워드(하나라도 들어 있으면 그 소재의 축제) |
| `source` | 결과 파일에 기록하는 출처 이름과 URL |

### 지도 표시

축제 데이터를 불러왔으면 축제 마커와 왼쪽 "축제" 목록은 항상 표시된다(켜고 끄는 토글은 없다). 선택한 날짜와 축제 날짜를 연도까지 그대로 비교하므로 다른 해의 축제는 나타나지 않는다(다른 해로 옮겨 보여주지 않는다). 날짜를 바꾸거나 재생할 때마다 갱신된다.

- 진행 중(시작일 ≤ 선택일 ≤ 종료일): 진한 마커. 종료 `FESTIVAL.endingSoonDays`일 이내이면 팝업에 "종료 임박"을 강조하고, 마지막 날에는 "오늘 종료"만 표시한다.
- 예정(시작일까지 `FESTIVAL.upcomingWindowDays`일 이내): 옅은 마커, 팝업에 D-N.
- 최근 종료(종료 후 `FESTIVAL.recentlyEndedWindowDays`일 이내): 옅은 마커, 팝업에 N일 전 종료.
- 기준 일수는 `js/config.js`의 `FESTIVAL`에서 바꾼다.
- 위 기간에 들지 않는 같은 해의 다른 축제는 지도를 `FESTIVAL.dotMinimumZoom`(기본 9, 처음 확대 수준 7보다 2단계 위) 이상으로 확대했을 때만 작은 점으로 나타난다. 선택한 날짜가 속한 해와 기간이 겹치는 축제만 점으로 보이며(다른 해는 보이지 않는다), 확대·축소하거나 날짜를 바꾸면 갱신된다. 점의 모양(`dotRadius`, `dotColor` 등)도 `FESTIVAL`에서 바꾼다. 점에 마우스를 올리면 축제 이름이 나오고, 눌러(Tab으로 이동해 Enter) 마커와 같은 팝업을 연다. 점 팝업에도 선택일 기준 상태(D-N 또는 N일 전 종료)가 나온다(진행 중인 축제는 항상 마커로 보인다).
- 지도 왼쪽 위의 "축제 (N)" 패널은 선택한 날짜 전후에 열리는 축제(마커로 표시되는 것과 같은 기준)를 진행 중 → 예정(시작일 순) → 최근 종료(최근 순)로 나열한다. 각 항목에 제목, 기간, 주소, 상태, 관련 소재 이름(예: 벚꽃 명소)이 나오고 진행 중인 축제는 강조된다. 해당하는 축제가 없으면 안내 문구를 보여 주며, 날짜를 바꾸거나 재생할 때마다 갱신된다.
- 목록 항목을 누르거나 Enter를 누르면 지도가 그 축제로 이동(현재 확대 수준과 `FESTIVAL.focusZoom` 중 큰 값, 움직임 줄이기 설정이면 애니메이션 없이)하고 팝업이 열린다. 패널 제목 줄 버튼으로 접고 펼 수 있고(`aria-expanded`), 패널 안에서 Esc를 누르면 접힌다. 넓은 화면에서는 기본으로 펼쳐지고, 좁은 화면(달력과 같은 기준)에서는 기본으로 접히며 항목을 고르거나 지도를 누르면 다시 접힌다. 팝업은 패널과 오른쪽 달력을 피해 열린다. 중간 너비 화면에서 패널과 달력 사이에 팝업이 들어갈 자리(`FESTIVAL.popupMaxWidth`에 `popupFrameWidth`를 더한 폭)가 없으면 항목을 고를 때 패널이 먼저 접히고, 마커나 점을 눌렀을 때는 달력을 우선해 피한다(이때 팝업이 펼친 패널 아래로 들어갈 수 있고, 패널은 직접 접을 수 있다). 목록에서 항목을 고르면 재생이 멈춘다. 패널의 Esc는 패널만 접는다.
- 명소를 눌러 열리는 패널 맨 아래에 "근처 축제" 목록이 나온다. 같은 소재(주제)의 축제 중 반경 `FESTIVAL.nearbyRadiusKilometers`km 안의 것을 가까운 순으로 최대 `FESTIVAL.nearbyMaxCount`개 보여 주며, 선택한 날짜와 같은 해의 축제만 대상이다(없으면 안내 문구).
- 각 축제에는 기간, 거리, 선택일 기준 상태(D-N·진행 중·종료)를 표시한다. 명소의 개화·단풍 날짜(선택한 해의 관측값이 있으면 관측일, 없으면 평년값 기준 예상일)가 축제 기간 안에 들면 "겹침" 줄을 강조해 보여 준다.
- 축제 데이터를 불러오지 못하면 이 목록도 나오지 않는다.
- 팝업에는 기간, 주소와 "출처: 한국관광공사"를 표시한다. `data/festivals.json`을 불러오지 못하면 오류 메시지에 파일이 나오고 축제 마커·점·왼쪽 목록은 나오지 않으며 나머지 지도는 그대로 동작한다.

축제 데이터 출처: 한국관광공사 TourAPI(https://api.visitkorea.or.kr, 공공데이터포털 국문 관광정보 서비스).

## 새 소재 추가

1. `data/`에 위 형식의 JSON 파일을 추가한다.
2. `js/config.js`의 `TOPICS` 배열에 `{ id, dataFile }` 항목을 하나 추가한다.
3. 기상청 관측값을 쓰는 소재라면 `scripts/kma-config.json`의 `topicDataFiles`에 데이터 파일을 추가하고, `eventCodes`에 `"<item>/<이벤트 이름>"` 항목마다 `ssnId`·`ssnMd`를 넣은 뒤 갱신 스크립트를 실행한다.
4. `seasonalNormal`(평년값)은 공식 출처를 보고 손으로 입력한다.
5. 필요하면 `js/speciesIcons.js`에 아이콘을 추가하고 종의 `icon`에 그 ID를 쓴다(없으면 종의 색 동그라미 마커로 표시된다).

추가한 소재는 지도에 자동으로 나타난다.

## 기상청 평년값 출처

기상청 계절관측 평년값(1991–2020): https://data.kma.go.kr/data/seasonObs/seasonObsDataList.do?pgmNo=648 (공공데이터포털 15097125, 이용허락범위 제한 없음). 벚꽃·단풍 장소의 `seasonalNormal`에 쓰였다.

개나리·진달래 평년값은 기상청 보도자료(2021-09-14) "봄꽃 빨리 피고, 매미 울음도 일찍 들려" 붙임3(https://www.weather.go.kr/kma/flexer/html/press/2021/09/14/ATC202109141250291_c31c7967-f978-4b12-b9e1-c6cbd3f9f51c.hwp.files/Sections1.html)과 인천은 수도권기상청 보도자료에서 가져왔다. 1991–2020 평년값은 API허브 `sfc_ssn_norm.php`로도 조회할 수 있으며, 개나리 값이 보도자료와 일치함을 확인했다.

- `isProxy: true`는 장소에 관측소가 없어 다른 관측소 값을 빌린 것이다. 보통 가장 가까운 관측소이고, 진달래 여수 영취산만 여수 평년값을 확인하지 못해 공식 평년값이 있는 광주를 쓴다. 유명산 단풍의 관측소-산 연결(예: 속초-설악산)은 추정이다.
- 벚꽃·단풍·개나리·진달래의 월 정보는 평년값에서 계산했다(첫 이벤트 날짜부터 마지막 이벤트 날짜+7일까지가 걸치는 달). `seasonalNormal`이 없는 장소는 지자체·관광 안내 페이지에 적힌 통상 절정 시기를 바탕으로 한 대략적인 월을 쓴다(천주산 4월, 고려산 4월, 비슬산 4–5월). 불국사 겹벚꽃은 관측 항목이 없어 기존 값을 쓴다.

개나리·진달래 장소의 좌표는 OpenStreetMap Nominatim(https://nominatim.openstreetmap.org)으로 찾은 대략값이다. 진달래 장소 중 평년값이 있는 곳은 모두 다른 관측소의 평년값을 빌린 것(`isProxy: true`)이다. 창원 천주산·강화 고려산·대구 비슬산은 산 정상부 군락이 평지 도시보다 몇 주 늦게 피어 도시 평년값이 오해를 부르므로 `seasonalNormal`을 두지 않았다. 이 장소는 설명과 관찰 팁만 보여주고 기상청 관측값도 받지 않는다.

샘플 데이터(개나리·진달래·벚꽃·단풍)의 좌표와 월 정보는 대략값이며 검증되지 않았다.
