import bcrypt from "bcrypt";
export const hashValue = async (value, saltRounds = 10) => await bcrypt.hash(value, saltRounds);
export const compareValue = async (value, hashedValue) => await bcrypt.compare(value, hashedValue);
