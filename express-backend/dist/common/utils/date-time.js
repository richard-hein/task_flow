import { add } from "date-fns";
export const thirtyDaysFromNow = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
export const fortyFiveMinutesFromNow = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 45);
    return now;
};
export const tenMinutesAgo = () => new Date(Date.now() - 10 * 60 * 1000);
export const threeMinutesAgo = () => new Date(Date.now() - 3 * 60 * 1000);
export const anHourFromNow = () => new Date(Date.now() + 60 * 60 * 1000);
export const calculateExpirationDate = (expiresIn = "15m") => {
    // Match number + unit (m = minutes, h = hours, d = days)
    const match = expiresIn.match(/^(\d+)([mhd])$/);
    if (!match)
        throw new Error('Invalid format. Use "15m", "1h", or "2d".');
    const [, value, unit] = match;
    if (!value || !unit)
        throw new Error("Invalid expiration format.");
    const expirationDate = new Date();
    // Check the unit and apply accordingly
    switch (unit) {
        case "m": // minutes
            return add(expirationDate, { minutes: parseInt(value) });
        case "h": // hours
            return add(expirationDate, { hours: parseInt(value) });
        case "d": // days
            return add(expirationDate, { days: parseInt(value) });
        default:
            throw new Error('Invalid unit. Use "m", "h", or "d".');
    }
};
export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
