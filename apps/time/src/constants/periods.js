// src/constants/periods.js

/**
 * Standard Full-Day School Schedule
 * Source: script.js
 */
export const PERIODS_LONG = [
    { id: "0", start: "09:10", end: "09:25", type: "reg" },
    { id: "1", start: "09:25", end: "10:05", type: "p" },
    { id: "2", start: "10:05", end: "10:45", type: "p" },
    { id: "break", start: "10:45", end: "11:00", type: "break" },
    { id: "3", start: "11:00", end: "11:40", type: "p" },
    { id: "4", start: "11:40", end: "12:20", type: "p" },
    { id: "5", start: "12:20", end: "13:00", type: "p" },
    { id: "6", start: "13:00", end: "13:35", type: "p" },
    { id: "7", start: "13:35", end: "14:10", type: "p" },
    { id: "8", start: "14:10", end: "14:50", type: "p" },
    { id: "9", start: "14:50", end: "15:30", type: "p" }
];

/**
 * Shortened/Friday School Schedule
 * Source: script.js
 */
export const PERIODS_SHORT = [
    { id: "0", start: "09:10", end: "09:25", type: "reg" },
    { id: "1", start: "09:25", end: "10:05", type: "p" },
    { id: "2", start: "10:05", end: "10:45", type: "p" },
    { id: "3", start: "10:45", end: "11:25", type: "p" },
    { id: "4", start: "11:25", end: "12:05", type: "p" },
    { id: "5", start: "12:05", end: "12:45", type: "p" },
    { id: "6", start: "12:45", end: "13:25", type: "p" },
    { id: "7", start: "13:25", end: "14:05", type: "p" }
];