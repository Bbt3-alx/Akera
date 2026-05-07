import bcrypt from "bcrypt";

export async function hashPin(pin) {
    return bcrypt.hash(pin, 12);
}

export async function comparePin(pin, hash) {
    return bcrypt.compare(pin, hash);
}