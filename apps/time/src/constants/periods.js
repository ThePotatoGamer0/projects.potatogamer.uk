// src/constants/periods.js

/**
 * Standard Full-Day School Schedule (Monday)
 * Source: script.js
 */
export const PERIODS_LONG = [
    { id: "0", start: "09:00", end: "10:30", type: "p" },
    { id: "break0", start: "10:30", end: "10:45", type: "break" },
    { id: "1", start: "10:45", end: "12:30", type: "p" },
    { id: "lunch", start: "12:30", end: "13:00", type: "break" },
    { id: "2", start: "13:00", end: "15:00", type: "p" },
    { id: "break1", start: "15:00", end: "15:15", type: "break" },
    { id: "3", start: "15:15", end: "16:45", type: "p" }
];

/**
 * Morning Only School Schedule (Tuesday & Wednesday)
 * Source: script.js
 */
export const PERIODS_HALF = [
    { id: "0", start: "09:00", end: "10:30", type: "p" },
    { id: "break0", start: "10:30", end: "10:45", type: "break" },
    { id: "1", start: "10:45", end: "12:30", type: "p" }
];

/**
 * Shortened/Friday School Schedule
 * Source: script.js
 */
export const PERIODS_SHORT = [
    { id: "0", start: "09:00", end: "10:30", type: "p" },
    { id: "break0", start: "10:30", end: "10:45", type: "break" },
    { id: "1", start: "10:45", end: "12:00", type: "p" },
    { id: "2", start: "12:00", end: "13:00", type: "p" }
];
