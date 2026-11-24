import { FESTIVAL, MESSAGES } from "./config.js";
import { formatMonthDayText, createClampedDate } from "./dateUtils.js";
import { getDistanceKilometers } from "./geoUtils.js";
import { mergeObservedEvents, parseMonthDay } from "./seasonStatus.js";
import { formatPeriod, createTextElement } from "./festivalLayer.js";
import {
  parseFestival,
  overlapsYear,
  getFestivalState,
  formatCompactStatusText,
} from "./festivalStatus.js";

const classOf = (suffix) => `${FESTIVAL.nearbyClassPrefix}${suffix}`;

const compareNearby = (a, b) =>
  a.distance - b.distance || a.festival.start.getTime() - b.festival.start.getTime();

const findNearbyFestivals = (site, topicId, festivals, year) =>
  festivals
    .map(parseFestival)
    .filter((festival) => festival.topicIds.includes(topicId) && overlapsYear(festival, year))
    .map((festival) => ({ festival, distance: getDistanceKilometers(site, festival) }))
    .filter(({ distance }) => distance <= FESTIVAL.nearbyRadiusKilometers)
    .sort(compareNearby)
    .slice(0, FESTIVAL.nearbyMaxCount);

const formatDistance = (distance) =>
  distance < FESTIVAL.nearbyMinimumDistanceKilometers
    ? `${FESTIVAL.nearbyMinimumDistanceKilometers}${MESSAGES.kilometerUnit}${MESSAGES.nearbyDistanceUnderMinimumSuffix}`
    : `${MESSAGES.nearbyDistancePrefix}${Math.round(distance)}${MESSAGES.kilometerUnit}`;

const getSiteEventDates = (siteContext, year) => {
  const { seasonalNormal } = siteContext.site;
  if (!seasonalNormal) {
    return [];
  }
  const { observedEvents } = siteContext;
  const observedNames = new Set(observedEvents.map((event) => event.name));
  return mergeObservedEvents(seasonalNormal.events, observedEvents).events.map((event) => {
    const { month, day } = parseMonthDay(event.date);
    return {
      name: event.name,
      date: createClampedDate(year, month - 1, day),
      isObserved: observedNames.has(event.name),
    };
  });
};

const formatOverlapEvent = ({ name, date, isObserved }) => {
  const basis = isObserved ? MESSAGES.nearbyObservedDate : MESSAGES.nearbyExpectedDate;
  return `${name} ${basis}(${formatMonthDayText(date)})`;
};

const createOverlapLine = (festival, siteContext, year) => {
  const overlapping = getSiteEventDates(siteContext, year).filter(
    ({ date }) => date >= festival.start && date <= festival.end,
  );
  if (overlapping.length === 0) {
    return null;
  }
  const text = overlapping.map(formatOverlapEvent).join(MESSAGES.seasonEventSeparator);
  return createTextElement("p", `${text}${MESSAGES.nearbyOverlapSuffix}`, classOf("__overlap"));
};

const createEntry = ({ festival, distance }, siteContext, selectedDate) => {
  const entry = document.createElement("div");
  entry.className = classOf("__entry");
  const metaText = [formatPeriod(festival), formatDistance(distance)].join(MESSAGES.festivalStatusSeparator);
  entry.append(
    createTextElement("h4", festival.title, classOf("__title")),
    createTextElement("p", metaText),
    createTextElement("p", formatCompactStatusText(getFestivalState(festival, selectedDate))),
  );
  const overlapLine = createOverlapLine(festival, siteContext, selectedDate.getFullYear());
  if (overlapLine !== null) {
    entry.append(overlapLine);
  }
  return entry;
};

const createEmptyLine = (year) =>
  createTextElement(
    "p",
    `${MESSAGES.nearbyEmptyPrefix}${FESTIVAL.nearbyRadiusKilometers}${MESSAGES.kilometerUnit}${MESSAGES.nearbyEmptyMiddle}${year}${MESSAGES.yearSuffix}${MESSAGES.nearbyEmptySuffix}`,
    classOf("__muted"),
  );

export const createNearbyFestivalsSection = (siteContext, festivals, selectedDate) => {
  const section = document.createElement("section");
  section.className = FESTIVAL.nearbyClassPrefix;
  section.append(
    createTextElement(
      "h3",
      `${MESSAGES.nearbyHeadingPrefix}${FESTIVAL.nearbyRadiusKilometers}${MESSAGES.kilometerUnit}${MESSAGES.nearbyHeadingSuffix}`,
    ),
  );
  const nearby = findNearbyFestivals(
    siteContext.site,
    siteContext.topicId,
    festivals,
    selectedDate.getFullYear(),
  );
  if (nearby.length === 0) {
    section.append(createEmptyLine(selectedDate.getFullYear()));
    return section;
  }
  section.append(
    ...nearby.map((item) => createEntry(item, siteContext, selectedDate)),
    createTextElement("p", MESSAGES.festivalSourceLine, classOf("__muted")),
  );
  return section;
};
